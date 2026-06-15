import { Router } from "express";
import authMiddleware from "../middlewares/auth.js";
import validateInvoice from "../middlewares/validateInvoice.js";
import {
    createInvoice,
    listInvoices,
    getInvoiceById,
    updateInvoice,
    deleteInvoice,
} from "../controllers/invoice.controllers.js";

const invoiceRouter = Router();

invoiceRouter.post("/", authMiddleware, validateInvoice, createInvoice);
invoiceRouter.get("/", authMiddleware, listInvoices);
invoiceRouter.get("/:invoiceId", authMiddleware, getInvoiceById);
invoiceRouter.patch("/:invoiceId", authMiddleware, updateInvoice);
invoiceRouter.delete("/:invoiceId", authMiddleware, deleteInvoice);

export default invoiceRouter;
