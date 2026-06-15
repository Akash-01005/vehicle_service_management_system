import userModel from "../models/user.model.js";
import hashPassword from "../libs/hashPassword.js";
import verifyPassword from "../libs/verifyPassword.js";
import tokenGenerator from "../libs/tokenGenerator.js";
import emailServer from "../config/mailServer.js";
import validateToken from "../libs/tokenValidator.js";

const saltRounds = Number.parseInt(process.env.SALT_ROUNDS, 10) || 10;
const secretKey = process.env.SECRET_KEY;
const accessTokenExpiry = process.env.ACCESS_TOKEN_EXPIRATION_TIME || process.env.TOKEN_EXPIRATION_TIME || "1d";
const refreshTokenExpiry = process.env.REFRESH_TOKEN_EXPIRATION_TIME || process.env.TOKEN_EXPIRATION_TIME || "7d";
const resetTokenExpiry = process.env.RESET_PASSWORD_TOKEN_EXPIRATION_TIME || "5m";
const accessCookieMaxAge = 24 * 60 * 60 * 1000;
const refreshCookieMaxAge = 7 * 24 * 60 * 60 * 1000;

const serializeUser = (user) => {
    const plainUser = user.toObject ? user.toObject() : user;
    const { password, refreshToken, __v, ...safeUser } = plainUser;
    return safeUser;
};

const buildAuthCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
});

const createTokenPair = (payload) => ({
    accessToken: tokenGenerator(payload, secretKey, accessTokenExpiry),
    refreshToken: tokenGenerator(payload, secretKey, refreshTokenExpiry),
});

const setAuthCookies = (res, accessToken, refreshToken) => {
    res.cookie("accessToken", accessToken, {
        ...buildAuthCookieOptions(),
        maxAge: accessCookieMaxAge,
    });

    res.cookie("refreshToken", refreshToken, {
        ...buildAuthCookieOptions(),
        maxAge: refreshCookieMaxAge,
    });
};

const clearAuthCookies = (res) => {
    res.clearCookie("accessToken", buildAuthCookieOptions());
    res.clearCookie("refreshToken", buildAuthCookieOptions());
};

export const createUser = async (req, res, next) => {
    try {
        const { garageId, firstName, lastName, email, phone, password, role, avatar } = req.body;

        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            const error = new Error("User already exists with this email!!");
            error.statusCode = 409;
            throw error;
        }

        const hashedPassword = await hashPassword(password, saltRounds);
        const createdUser = await userModel.create({
            garageId,
            firstName,
            lastName,
            email,
            phone,
            password: hashedPassword,
            role,
            avatar,
        });

        return res.status(201).json({
            message: "User created successfully...",
            user: serializeUser(createdUser),
        });
    } catch (error) {
        console.error("Error creating user:", error);
        next(error);
    }
};

export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await userModel.findOne({ email }).select("+password +refreshToken");

        if (!user) {
            const error = new Error("Invalid email or password!!");
            error.statusCode = 401;
            throw error;
        }

        const isPasswordValid = await verifyPassword(password, user.password);
        if (!isPasswordValid) {
            const error = new Error("Invalid email or password!!");
            error.statusCode = 401;
            throw error;
        }

        const tokenPair = createTokenPair({
            userId: user._id,
            garageId: user.garageId,
            role: user.role,
        });

        user.lastLogin = new Date();
        user.refreshToken = tokenPair.refreshToken;
        await user.save();

        setAuthCookies(res, tokenPair.accessToken, tokenPair.refreshToken);

        return res.status(200).json({
            message: "Login successful...",
            user: serializeUser(user),
        });
    } catch (error) {
        console.error("Error during login:", error);
        next(error);
    }
};

export const refreshAccessToken = async (req, res, next) => {
    try {
        const incomingRefreshToken = req.cookies.refreshToken;

        if (!incomingRefreshToken) {
            const error = new Error("Unauthorized!! No refresh token provided");
            error.statusCode = 401;
            throw error;
        }

        const decodedToken = validateToken(incomingRefreshToken, secretKey);
        if (!decodedToken) {
            const error = new Error("Unauthorized!! Invalid refresh token");
            error.statusCode = 401;
            throw error;
        }

        const user = await userModel.findById(decodedToken.userId).select("+refreshToken");
        if (!user || user.refreshToken !== incomingRefreshToken) {
            const error = new Error("Unauthorized!! Refresh token mismatch");
            error.statusCode = 401;
            throw error;
        }

        const tokenPair = createTokenPair({
            userId: user._id,
            garageId: user.garageId,
            role: user.role,
        });

        user.refreshToken = tokenPair.refreshToken;
        await user.save();

        setAuthCookies(res, tokenPair.accessToken, tokenPair.refreshToken);

        return res.status(200).json({
            message: "Token refreshed successfully...",
        });
    } catch (error) {
        console.error("Error refreshing access token:", error);
        next(error);
    }
};

export const logout = async (req, res, next) => {
    try {
        const accessToken = req.cookies.accessToken;
        const refreshToken = req.cookies.refreshToken;

        let userId = null;

        if (accessToken) {
            const decodedAccessToken = validateToken(accessToken, secretKey);
            if (decodedAccessToken?.userId) {
                userId = decodedAccessToken.userId;
            }
        }

        if (!userId && refreshToken) {
            const decodedRefreshToken = validateToken(refreshToken, secretKey);
            if (decodedRefreshToken?.userId) {
                userId = decodedRefreshToken.userId;
            }
        }

        if (userId) {
            await userModel.findByIdAndUpdate(userId, { refreshToken: null });
        }

        clearAuthCookies(res);
        return res.status(200).json({
            message: "Logout successful...",
        });
    } catch (error) {
        console.error("Error during logout:", error);
        next(error);
    }
};

export const getUserProfile = async (req, res, next) => {
    try {
        const { userID } = req;
        const user = await userModel.findById(userID).select("-password -refreshToken");

        if (!user) {
            const error = new Error("User not found!!");
            error.statusCode = 404;
            throw error;
        }

        return res.status(200).json({
            message: "User profile fetched successfully...",
            user,
        });
    } catch (error) {
        console.error("Error fetching user profile:", error);
        next(error);
    }
};

export const deleteUser = async (req, res, next) => {
    try {
        const { userID } = req;
        const user = await userModel.findByIdAndDelete(userID);

        if (!user) {
            const error = new Error("User not found!!");
            error.statusCode = 404;
            throw error;
        }

        return res.status(200).json({
            message: "User deleted successfully...",
        });
    } catch (error) {
        console.error("Error deleting user:", error);
        next(error);
    }
};

export const updateUser = async (req, res, next) => {
    try {
        const { userID } = req;
        const { firstName, lastName, email, phone, role, avatar, isActive, password } = req.body;
        const updateData = {};

        if (firstName !== undefined) updateData.firstName = firstName;
        if (lastName !== undefined) updateData.lastName = lastName;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
        if (role !== undefined) updateData.role = role;
        if (avatar !== undefined) updateData.avatar = avatar;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (password !== undefined) updateData.password = await hashPassword(password, saltRounds);

        if (email !== undefined) {
            const existingUser = await userModel.findOne({ email, _id: { $ne: userID } });
            if (existingUser) {
                const error = new Error("User already exists with this email!!");
                error.statusCode = 409;
                throw error;
            }
        }

        const user = await userModel.findByIdAndUpdate(userID, updateData, {
            new: true,
            runValidators: true,
        }).select("-password -refreshToken");

        if (!user) {
            const error = new Error("User not found!!");
            error.statusCode = 404;
            throw error;
        }

        return res.status(200).json({
            message: "User updated successfully...",
            user,
        });
    } catch (error) {
        console.error("Error updating user:", error);
        next(error);
    }
};

export const forgotPasswordLink = async (req, res, next) => {
    try {
        const { email } = req.body;
        const user = await userModel.findOne({ email });

        if (!user) {
            const error = new Error("User not found!!");
            error.statusCode = 404;
            throw error;
        }

        const resetToken = tokenGenerator({ userId: user._id }, secretKey, resetTokenExpiry);

        res.cookie("resetToken", resetToken, {
            ...buildAuthCookieOptions(),
            maxAge: 1000 * 60 * 5,
        });

        await emailServer(email, resetToken);
        return res.status(200).json({
            message: "Password reset link sent to your email...",
        });
    } catch (error) {
        console.error("Error sending forgot password email:", error);
        next(error);
    }
};

export const forgotPassword = async (req, res, next) => {
    try {
        const { resetToken } = req.params;
        const { newPassword } = req.body;

        if (!resetToken) {
            const error = new Error("Reset token is missing!!");
            error.statusCode = 400;
            throw error;
        }

        const validatingToken = validateToken(resetToken, secretKey);
        if (!validatingToken) {
            const error = new Error("Invalid or expired reset token!!");
            error.statusCode = 400;
            throw error;
        }

        const user = await userModel.findById(validatingToken.userId);
        if (!user) {
            const error = new Error("User not found!!");
            error.statusCode = 404;
            throw error;
        }

        const hashedPassword = await hashPassword(newPassword, saltRounds);

        await userModel.findByIdAndUpdate(user._id, {
            password: hashedPassword,
            refreshToken: null,
        });

        res.clearCookie("resetToken", buildAuthCookieOptions());

        return res.status(200).json({
            message: "Password reset successful...",
        });
    } catch (error) {
        console.error("Error resetting password:", error);
        next(error);
    }
};

