import { Router } from "express";
import multer from "multer";
import authMiddleware from "../middlewares/auth.js";
import { validateDocumentCreate, validateDocumentUpdate } from "../middlewares/validateDocument.js";
import {
    deleteDocument,
    downloadDocument,
    getDocumentById,
    listDocuments,
    updateDocument,
    uploadDocument,
} from "../controllers/document.controllers.js";

const documentRouter = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
});

documentRouter.post("/", authMiddleware, upload.single("file"), validateDocumentCreate, uploadDocument);
documentRouter.get("/", authMiddleware, listDocuments);
documentRouter.get("/:documentId", authMiddleware, getDocumentById);
documentRouter.get("/:documentId/download", authMiddleware, downloadDocument);
documentRouter.patch("/:documentId", authMiddleware, validateDocumentUpdate, updateDocument);
documentRouter.delete("/:documentId", authMiddleware, deleteDocument);

export default documentRouter;
