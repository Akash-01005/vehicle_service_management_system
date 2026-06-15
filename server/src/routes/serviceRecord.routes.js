import { Router } from "express";
import authMiddleware from "../middlewares/auth.js";
import validateServiceRecord from "../middlewares/validateServiceRecord.js";
import {
    createServiceRecord,
    listServiceRecords,
    getServiceRecordById,
    updateServiceRecord,
    deleteServiceRecord,
} from "../controllers/serviceRecord.controllers.js";

const serviceRecordRouter = Router();

serviceRecordRouter.post("/", authMiddleware, validateServiceRecord, createServiceRecord);
serviceRecordRouter.get("/", authMiddleware, listServiceRecords);
serviceRecordRouter.get("/:serviceRecordId", authMiddleware, getServiceRecordById);
serviceRecordRouter.patch("/:serviceRecordId", authMiddleware, updateServiceRecord);
serviceRecordRouter.delete("/:serviceRecordId", authMiddleware, deleteServiceRecord);

export default serviceRecordRouter;
