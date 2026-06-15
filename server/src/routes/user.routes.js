import { Router } from "express";
import {
	createUser,
	login,
	refreshAccessToken,
	logout,
	getUserProfile,
	deleteUser,
	updateUser,
	forgotPassword,
	forgotPasswordLink,
} from "../controllers/user.controllers.js";
import validateRegister from "../middlewares/validateRegister.js";
import authMiddleware from "../middlewares/auth.js";

const userRouter = Router();

userRouter.post("/register", validateRegister, createUser);
userRouter.post("/login", login);
userRouter.post("/refresh-token", refreshAccessToken);
userRouter.post("/reset-password-link", forgotPasswordLink);
userRouter.post("/reset-password/:token", forgotPassword);

userRouter.delete("/logout", authMiddleware, logout);

userRouter.get("/profile", authMiddleware, getUserProfile);
userRouter.patch("/update", authMiddleware, updateUser);
userRouter.delete("/delete", authMiddleware, deleteUser);

export default userRouter;