import garageModel from "../models/garage.model.js";
import userModel from "../models/user.model.js";

const serializeGarage = (garage) => {
    const plainGarage = garage.toObject ? garage.toObject() : garage;
    const { __v, ...safeGarage } = plainGarage;
    return safeGarage;
};

const getCurrentUser = async (userID) => {
    return userModel.findById(userID).select("role garageId isActive");
};

const isGarageManager = (role) => role === "owner" || role === "admin";

export const createGarage = async (req, res, next) => {
    try {
        const { name, email, phone, address, gstNumber, logo } = req.body;

        const existingGarage = await garageModel.findOne({ email });
        if (existingGarage) {
            const error = new Error("Garage already exists with this email!!");
            error.statusCode = 409;
            throw error;
        }

        const garage = await garageModel.create({
            name,
            email,
            phone,
            address,
            gstNumber,
            logo,
        });

        return res.status(201).json({
            message: "Garage created successfully...",
            garage: serializeGarage(garage),
        });
    } catch (error) {
        console.error("Error creating garage:", error);
        next(error);
    }
};

export const getGarageProfile = async (req, res, next) => {
    try {
        const garageID = req.garageID || req.params.garageId;
        const garage = await garageModel.findById(garageID);

        if (!garage) {
            const error = new Error("Garage not found!!");
            error.statusCode = 404;
            throw error;
        }

        return res.status(200).json({
            message: "Garage profile fetched successfully...",
            garage: serializeGarage(garage),
        });
    } catch (error) {
        console.error("Error fetching garage profile:", error);
        next(error);
    }
};

export const listGarages = async (req, res, next) => {
    try {
        const currentUser = await getCurrentUser(req.userID);

        if (!currentUser || !isGarageManager(currentUser.role)) {
            const error = new Error("Forbidden!! You do not have access to garage list");
            error.statusCode = 403;
            throw error;
        }

        const garages = await garageModel.find().sort({ createdAt: -1 });

        return res.status(200).json({
            message: "Garages fetched successfully...",
            garages: garages.map(serializeGarage),
        });
    } catch (error) {
        console.error("Error listing garages:", error);
        next(error);
    }
};

export const updateGarage = async (req, res, next) => {
    try {
        const currentUser = await getCurrentUser(req.userID);

        if (!currentUser || !isGarageManager(currentUser.role)) {
            const error = new Error("Forbidden!! You do not have access to update garage");
            error.statusCode = 403;
            throw error;
        }

        if (currentUser.garageId?.toString() !== req.garageID?.toString() && currentUser.role !== "owner") {
            const error = new Error("Forbidden!! You can only update your own garage");
            error.statusCode = 403;
            throw error;
        }

        const { name, email, phone, address, gstNumber, logo, isActive } = req.body;
        const updateData = {};

        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
        if (address !== undefined) updateData.address = address;
        if (gstNumber !== undefined) updateData.gstNumber = gstNumber;
        if (logo !== undefined) updateData.logo = logo;
        if (isActive !== undefined) updateData.isActive = isActive;

        if (email !== undefined) {
            const existingGarage = await garageModel.findOne({ email, _id: { $ne: req.garageID } });
            if (existingGarage) {
                const error = new Error("Garage already exists with this email!!");
                error.statusCode = 409;
                throw error;
            }
        }

        const garage = await garageModel.findByIdAndUpdate(req.garageID, updateData, {
            new: true,
            runValidators: true,
        });

        if (!garage) {
            const error = new Error("Garage not found!!");
            error.statusCode = 404;
            throw error;
        }

        return res.status(200).json({
            message: "Garage updated successfully...",
            garage: serializeGarage(garage),
        });
    } catch (error) {
        console.error("Error updating garage:", error);
        next(error);
    }
};

export const deactivateGarage = async (req, res, next) => {
    try {
        const currentUser = await getCurrentUser(req.userID);

        if (!currentUser || !isGarageManager(currentUser.role)) {
            const error = new Error("Forbidden!! You do not have access to deactivate garage");
            error.statusCode = 403;
            throw error;
        }

        if (currentUser.garageId?.toString() !== req.garageID?.toString() && currentUser.role !== "owner") {
            const error = new Error("Forbidden!! You can only deactivate your own garage");
            error.statusCode = 403;
            throw error;
        }

        const garage = await garageModel.findByIdAndUpdate(
            req.garageID,
            { isActive: false },
            { new: true }
        );

        if (!garage) {
            const error = new Error("Garage not found!!");
            error.statusCode = 404;
            throw error;
        }

        return res.status(200).json({
            message: "Garage deactivated successfully...",
            garage: serializeGarage(garage),
        });
    } catch (error) {
        console.error("Error deactivating garage:", error);
        next(error);
    }
};

export const deleteGarage = async (req, res, next) => {
    try {
        const currentUser = await getCurrentUser(req.userID);

        if (!currentUser || currentUser.role !== "owner") {
            const error = new Error("Forbidden!! Only owner can delete garage");
            error.statusCode = 403;
            throw error;
        }

        if (currentUser.garageId?.toString() !== req.garageID?.toString()) {
            const error = new Error("Forbidden!! You can only delete your own garage");
            error.statusCode = 403;
            throw error;
        }

        const garage = await garageModel.findByIdAndDelete(req.garageID);

        if (!garage) {
            const error = new Error("Garage not found!!");
            error.statusCode = 404;
            throw error;
        }

        return res.status(200).json({
            message: "Garage deleted successfully...",
        });
    } catch (error) {
        console.error("Error deleting garage:", error);
        next(error);
    }
};
