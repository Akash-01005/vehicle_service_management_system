import { Router } from "express";
import authMiddleware from "../middlewares/auth.js";
import {
    createGarage,
    getGarageProfile,
    listGarages,
    updateGarage,
    deactivateGarage,
    deleteGarage,
} from "../controllers/garage.controllers.js";

const garageRouter = Router();

garageRouter.post("/", createGarage);
garageRouter.get("/", authMiddleware, listGarages);
garageRouter.get("/me", authMiddleware, getGarageProfile);
garageRouter.patch("/me", authMiddleware, updateGarage);
garageRouter.patch("/me/deactivate", authMiddleware, deactivateGarage);
garageRouter.delete("/me", authMiddleware, deleteGarage);

export default garageRouter;
