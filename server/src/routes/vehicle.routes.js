import { Router } from "express";
import authMiddleware from "../middlewares/auth.js";
import validateVehicle from "../middlewares/validateVehicle.js";
import {
    createVehicle,
    listVehicles,
    getVehicleById,
    updateVehicle,
    deleteVehicle,
} from "../controllers/vehicle.controllers.js";

const vehicleRouter = Router();

vehicleRouter.post("/", authMiddleware, validateVehicle, createVehicle);
vehicleRouter.get("/", authMiddleware, listVehicles);
vehicleRouter.get("/:vehicleId", authMiddleware, getVehicleById);
vehicleRouter.patch("/:vehicleId", authMiddleware, updateVehicle);
vehicleRouter.delete("/:vehicleId", authMiddleware, deleteVehicle);

export default vehicleRouter;
