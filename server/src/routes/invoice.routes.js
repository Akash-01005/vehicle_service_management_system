import { Router } from "express";
import authMiddleware from "../middlewares/auth.js";
import validateInvoice, { validateInvoiceUpdate } from "../middlewares/validateInvoice.js";
import {
    createInvoice,
    listInvoices,
    getInvoiceById,
    updateInvoice,
    deleteInvoice,
    downloadInvoicePdf,
} from "../controllers/invoice.controllers.js";

const invoiceRouter = Router();

invoiceRouter.post("/", authMiddleware, validateInvoice, createInvoice);
invoiceRouter.get("/", authMiddleware, listInvoices);
invoiceRouter.get("/:invoiceId", authMiddleware, getInvoiceById);
invoiceRouter.get("/:invoiceId/pdf", authMiddleware, downloadInvoicePdf);
invoiceRouter.patch("/:invoiceId", authMiddleware, validateInvoiceUpdate, updateInvoice);
invoiceRouter.delete("/:invoiceId", authMiddleware, deleteInvoice);

export default invoiceRouter;
