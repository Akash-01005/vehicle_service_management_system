import { Router } from "express";
import {
	createUser,
	login,
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
userRouter.post("/reset-password-link", forgotPasswordLink);
userRouter.post("/reset-password/:token", forgotPassword);

userRouter.use(authMiddleware);
userRouter.get("/profile", getUserProfile);
userRouter.patch("/update", updateUser);
userRouter.delete("/logout", logout);
userRouter.delete("/delete", deleteUser);

export default userRouter;