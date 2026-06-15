import { Router } from "express";
import authMiddleware from "../middlewares/auth.js";
import validateJobCard from "../middlewares/validateJobCard.js";
import {
    createJobCard,
    listJobCards,
    getJobCardById,
    updateJobCard,
    deleteJobCard,
} from "../controllers/jobCard.controllers.js";

const jobCardRouter = Router();

jobCardRouter.post("/", authMiddleware, validateJobCard, createJobCard);
jobCardRouter.get("/", authMiddleware, listJobCards);
jobCardRouter.get("/:jobCardId", authMiddleware, getJobCardById);
jobCardRouter.patch("/:jobCardId", authMiddleware, updateJobCard);
jobCardRouter.delete("/:jobCardId", authMiddleware, deleteJobCard);

export default jobCardRouter;
