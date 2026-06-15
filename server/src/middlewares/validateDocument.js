import mongoose from "mongoose";

const allowedDocumentTypes = ["registration", "insurance", "license", "estimate", "invoice", "job_card", "service_record", "other"];
const allowedMimeTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

const validateObjectId = (value, fieldName, errors, required = false) => {
    if (required && !value) {
        errors.push(`${fieldName} is required and must be a valid ObjectId`);
        return;
    }

    if (value !== undefined && value !== null && value !== "" && (typeof value !== "string" || !mongoose.Types.ObjectId.isValid(value))) {
        errors.push(`${fieldName} must be a valid ObjectId if provided`);
    }
};

const validateDocumentPayload = (req, options = {}) => {
    const errors = [];
    const { requireFile = false } = options;
    const { garageId, customerId, vehicleId, jobCardId, serviceRecordId, invoiceId, documentType, title, notes } = req.body || {};

    validateObjectId(garageId, "garageId", errors, false);
    validateObjectId(customerId, "customerId", errors);
    validateObjectId(vehicleId, "vehicleId", errors);
    validateObjectId(jobCardId, "jobCardId", errors);
    validateObjectId(serviceRecordId, "serviceRecordId", errors);
    validateObjectId(invoiceId, "invoiceId", errors);

    if (documentType !== undefined && documentType !== null && !allowedDocumentTypes.includes(documentType)) {
        errors.push(`documentType must be one of: ${allowedDocumentTypes.join(", ")}`);
    }

    if (title !== undefined && title !== null && (typeof title !== "string" || !title.trim())) {
        errors.push("title must be a non-empty string if provided");
    }

    if (notes !== undefined && notes !== null && typeof notes !== "string") {
        errors.push("notes must be a string if provided");
    }

    if (requireFile && !req.file) {
        errors.push("file is required");
    }

    if (req.file && !allowedMimeTypes.includes(req.file.mimetype)) {
        errors.push(`file type must be one of: ${allowedMimeTypes.join(", ")}`);
    }

    return errors;
};

const sendValidationErrors = (res, errors) => {
    return res.status(400).json({
        success: false,
        message: "Validation failed",
        details: errors,
    });
};

export const validateDocumentCreate = (req, res, next) => {
    const errors = validateDocumentPayload(req, { requireFile: true });

    if (errors.length) {
        return sendValidationErrors(res, errors);
    }

    next();
};

export const validateDocumentUpdate = (req, res, next) => {
    const errors = validateDocumentPayload(req, { requireFile: false });

    if (errors.length) {
        return sendValidationErrors(res, errors);
    }

    next();
};
