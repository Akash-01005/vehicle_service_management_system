import documentModel from "../models/document.model.js";
import userModel from "../models/user.model.js";
import customerModel from "../models/customer.model.js";
import vehicleModel from "../models/vechicle.model.js";
import jobCardModel from "../models/jobCard.model.js";
import serviceRecordModel from "../models/serviceRecord.model.js";
import invoiceModel from "../models/invoice.model.js";
import {
    buildDocumentKey,
    deleteDocumentFromS3,
    getDocumentStreamFromS3,
    uploadDocumentToS3,
} from "../libs/documentStorage.js";

const serializeDocument = (document) => {
    const plainDocument = document.toObject ? document.toObject() : document;
    const { __v, ...safeDocument } = plainDocument;
    return safeDocument;
};

const getCurrentUser = async (userID) => {
    return userModel.findById(userID).select("role garageId isActive");
};

const canManageDocuments = (role) => role === "admin" || role === "service_advisor";
const isAdmin = (role) => role === "admin";

const normalizeNullableId = (value) => {
    if (value === undefined || value === null || value === "") {
        return null;
    }

    return value;
};

const normalizeDocumentData = (body) => {
    const data = {};
    const { garageId, customerId, vehicleId, jobCardId, serviceRecordId, invoiceId, documentType, title, notes } = body;

    if (garageId !== undefined) data.garageId = garageId;
    if (customerId !== undefined) data.customerId = normalizeNullableId(customerId);
    if (vehicleId !== undefined) data.vehicleId = normalizeNullableId(vehicleId);
    if (jobCardId !== undefined) data.jobCardId = normalizeNullableId(jobCardId);
    if (serviceRecordId !== undefined) data.serviceRecordId = normalizeNullableId(serviceRecordId);
    if (invoiceId !== undefined) data.invoiceId = normalizeNullableId(invoiceId);
    if (documentType !== undefined) data.documentType = documentType;
    if (title !== undefined) data.title = title;
    if (notes !== undefined) data.notes = notes;

    return data;
};

const ensureGarageAccess = (currentUser, garageId) => {
    if (currentUser.role !== "admin" && garageId.toString() !== currentUser.garageId.toString()) {
        const error = new Error("Forbidden!! You can only manage documents for your own garage");
        error.statusCode = 403;
        throw error;
    }
};

const validateDocumentReferences = async (currentUser, garageId, references) => {
    ensureGarageAccess(currentUser, garageId);

    const [customer, vehicle, jobCard, serviceRecord, invoice] = await Promise.all([
        references.customerId ? customerModel.findById(references.customerId) : Promise.resolve(null),
        references.vehicleId ? vehicleModel.findById(references.vehicleId) : Promise.resolve(null),
        references.jobCardId ? jobCardModel.findById(references.jobCardId) : Promise.resolve(null),
        references.serviceRecordId ? serviceRecordModel.findById(references.serviceRecordId) : Promise.resolve(null),
        references.invoiceId ? invoiceModel.findById(references.invoiceId) : Promise.resolve(null),
    ]);

    if (references.customerId && !customer) {
        const error = new Error("Customer not found!!");
        error.statusCode = 404;
        throw error;
    }

    if (references.vehicleId && !vehicle) {
        const error = new Error("Vehicle not found!!");
        error.statusCode = 404;
        throw error;
    }

    if (references.jobCardId && !jobCard) {
        const error = new Error("Job card not found!!");
        error.statusCode = 404;
        throw error;
    }

    if (references.serviceRecordId && !serviceRecord) {
        const error = new Error("Service record not found!!");
        error.statusCode = 404;
        throw error;
    }

    if (references.invoiceId && !invoice) {
        const error = new Error("Invoice not found!!");
        error.statusCode = 404;
        throw error;
    }

    const linkedRecords = [customer, vehicle, jobCard, serviceRecord, invoice].filter(Boolean);

    if (linkedRecords.some((record) => record.garageId.toString() !== garageId.toString())) {
        const error = new Error("Forbidden!! Linked records must belong to the same garage");
        error.statusCode = 403;
        throw error;
    }

    if (customer && vehicle && vehicle.customerId.toString() !== customer._id.toString()) {
        const error = new Error("Vehicle does not belong to the selected customer");
        error.statusCode = 400;
        throw error;
    }

    if (customer && jobCard && jobCard.customerId.toString() !== customer._id.toString()) {
        const error = new Error("Job card does not belong to the selected customer");
        error.statusCode = 400;
        throw error;
    }

    if (vehicle && jobCard && jobCard.vehicleId.toString() !== vehicle._id.toString()) {
        const error = new Error("Job card does not belong to the selected vehicle");
        error.statusCode = 400;
        throw error;
    }

    if (vehicle && serviceRecord && serviceRecord.vehicleId.toString() !== vehicle._id.toString()) {
        const error = new Error("Service record does not belong to the selected vehicle");
        error.statusCode = 400;
        throw error;
    }

    if (jobCard && serviceRecord && serviceRecord.jobCardId.toString() !== jobCard._id.toString()) {
        const error = new Error("Service record does not belong to the selected job card");
        error.statusCode = 400;
        throw error;
    }

    if (invoice) {
        if (customer && invoice.customerId.toString() !== customer._id.toString()) {
            const error = new Error("Invoice does not belong to the selected customer");
            error.statusCode = 400;
            throw error;
        }

        if (vehicle && invoice.vehicleId.toString() !== vehicle._id.toString()) {
            const error = new Error("Invoice does not belong to the selected vehicle");
            error.statusCode = 400;
            throw error;
        }

        if (jobCard && invoice.jobCardId.toString() !== jobCard._id.toString()) {
            const error = new Error("Invoice does not belong to the selected job card");
            error.statusCode = 400;
            throw error;
        }
    }
};

const getDocumentScope = async (currentUser, documentId) => {
    const document = await documentModel.findById(documentId);

    if (!document) {
        const error = new Error("Document not found!!");
        error.statusCode = 404;
        throw error;
    }

    ensureGarageAccess(currentUser, document.garageId);

    return document;
};

export const uploadDocument = async (req, res, next) => {
    try {
        const currentUser = await getCurrentUser(req.userID);

        if (!currentUser || !canManageDocuments(currentUser.role)) {
            const error = new Error("Forbidden!! You do not have access to upload document");
            error.statusCode = 403;
            throw error;
        }

        const data = normalizeDocumentData(req.body);
        const effectiveGarageId = currentUser.role === "admin" && data.garageId ? data.garageId : currentUser.garageId;

        await validateDocumentReferences(currentUser, effectiveGarageId, data);

        const s3Key = buildDocumentKey(effectiveGarageId, req.file.originalname);
        const documentAsset = await uploadDocumentToS3({
            key: s3Key,
            buffer: req.file.buffer,
            contentType: req.file.mimetype,
        });

        let document;

        try {
            document = await documentModel.create({
                garageId: effectiveGarageId,
                customerId: data.customerId || null,
                vehicleId: data.vehicleId || null,
                jobCardId: data.jobCardId || null,
                serviceRecordId: data.serviceRecordId || null,
                invoiceId: data.invoiceId || null,
                uploadedBy: currentUser._id,
                documentType: data.documentType || "other",
                title: data.title || req.file.originalname,
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
                size: req.file.size,
                s3Key: documentAsset.key,
                s3Url: documentAsset.url,
                notes: data.notes,
            });
        } catch (createError) {
            await deleteDocumentFromS3(documentAsset.key);
            throw createError;
        }

        return res.status(201).json({
            message: "Document uploaded successfully...",
            document: serializeDocument(document),
        });
    } catch (error) {
        console.error("Error uploading document:", error);
        next(error);
    }
};

export const listDocuments = async (req, res, next) => {
    try {
        const currentUser = await getCurrentUser(req.userID);

        if (!currentUser || !canManageDocuments(currentUser.role)) {
            const error = new Error("Forbidden!! You do not have access to document list");
            error.statusCode = 403;
            throw error;
        }

        const query = currentUser.role === "admin" && req.query.garageId
            ? { garageId: req.query.garageId }
            : { garageId: currentUser.garageId };

        if (req.query.customerId) query.customerId = req.query.customerId;
        if (req.query.vehicleId) query.vehicleId = req.query.vehicleId;
        if (req.query.jobCardId) query.jobCardId = req.query.jobCardId;
        if (req.query.serviceRecordId) query.serviceRecordId = req.query.serviceRecordId;
        if (req.query.invoiceId) query.invoiceId = req.query.invoiceId;
        if (req.query.documentType) query.documentType = req.query.documentType;

        const documents = await documentModel.find(query).sort({ createdAt: -1 });

        return res.status(200).json({
            message: "Documents fetched successfully...",
            documents: documents.map(serializeDocument),
        });
    } catch (error) {
        console.error("Error listing documents:", error);
        next(error);
    }
};

export const getDocumentById = async (req, res, next) => {
    try {
        const currentUser = await getCurrentUser(req.userID);

        if (!currentUser || !canManageDocuments(currentUser.role)) {
            const error = new Error("Forbidden!! You do not have access to document data");
            error.statusCode = 403;
            throw error;
        }

        const document = await getDocumentScope(currentUser, req.params.documentId);

        return res.status(200).json({
            message: "Document fetched successfully...",
            document: serializeDocument(document),
        });
    } catch (error) {
        console.error("Error fetching document:", error);
        next(error);
    }
};

export const updateDocument = async (req, res, next) => {
    try {
        const currentUser = await getCurrentUser(req.userID);

        if (!currentUser || !canManageDocuments(currentUser.role)) {
            const error = new Error("Forbidden!! You do not have access to update document");
            error.statusCode = 403;
            throw error;
        }

        const document = await getDocumentScope(currentUser, req.params.documentId);
        const data = normalizeDocumentData(req.body);
        const effectiveGarageId = data.garageId || document.garageId;

        if (data.garageId !== undefined && currentUser.role !== "admin") {
            const error = new Error("Forbidden!! You can only update documents in your own garage");
            error.statusCode = 403;
            throw error;
        }

        await validateDocumentReferences(currentUser, effectiveGarageId, {
            customerId: data.customerId !== undefined ? data.customerId : document.customerId,
            vehicleId: data.vehicleId !== undefined ? data.vehicleId : document.vehicleId,
            jobCardId: data.jobCardId !== undefined ? data.jobCardId : document.jobCardId,
            serviceRecordId: data.serviceRecordId !== undefined ? data.serviceRecordId : document.serviceRecordId,
            invoiceId: data.invoiceId !== undefined ? data.invoiceId : document.invoiceId,
        });

        const updatedDocument = await documentModel.findByIdAndUpdate(document._id, data, {
            new: true,
            runValidators: true,
        });

        return res.status(200).json({
            message: "Document updated successfully...",
            document: serializeDocument(updatedDocument),
        });
    } catch (error) {
        console.error("Error updating document:", error);
        next(error);
    }
};

export const downloadDocument = async (req, res, next) => {
    try {
        const currentUser = await getCurrentUser(req.userID);

        if (!currentUser || !canManageDocuments(currentUser.role)) {
            const error = new Error("Forbidden!! You do not have access to download document");
            error.statusCode = 403;
            throw error;
        }

        const document = await getDocumentScope(currentUser, req.params.documentId);
        const fileResponse = await getDocumentStreamFromS3(document.s3Key);

        if (!fileResponse.Body) {
            const error = new Error("Document file is empty");
            error.statusCode = 500;
            throw error;
        }

        const fileName = document.originalName.replace(/[^a-zA-Z0-9._-]/g, "-");

        res.setHeader("Content-Type", document.mimeType);
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        fileResponse.Body.pipe(res);
    } catch (error) {
        console.error("Error downloading document:", error);
        next(error);
    }
};

export const deleteDocument = async (req, res, next) => {
    try {
        const currentUser = await getCurrentUser(req.userID);

        if (!currentUser || !isAdmin(currentUser.role)) {
            const error = new Error("Forbidden!! Only admin can delete document");
            error.statusCode = 403;
            throw error;
        }

        const document = await documentModel.findByIdAndDelete(req.params.documentId);

        if (!document) {
            const error = new Error("Document not found!!");
            error.statusCode = 404;
            throw error;
        }

        await deleteDocumentFromS3(document.s3Key);

        return res.status(200).json({
            message: "Document deleted successfully...",
        });
    } catch (error) {
        console.error("Error deleting document:", error);
        next(error);
    }
};
