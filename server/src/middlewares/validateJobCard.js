import mongoose from "mongoose";

const allowedPriorities = ["low", "medium", "high"];
const allowedStatuses = ["pending", "in_progress", "waiting_for_parts", "completed", "cancelled"];

export default function validateJobCard(req, res, next) {
    const errors = [];
    const { garageId, customerId, vehicleId, assignedMechanic, complaints, inspectionNotes, estimatedCost, priority, status, expectedDeliveryDate } = req.body || {};

    if (!garageId || typeof garageId !== "string" || !mongoose.Types.ObjectId.isValid(garageId)) {
        errors.push("garageId is required and must be a valid ObjectId");
    }

    if (!customerId || typeof customerId !== "string" || !mongoose.Types.ObjectId.isValid(customerId)) {
        errors.push("customerId is required and must be a valid ObjectId");
    }

    if (!vehicleId || typeof vehicleId !== "string" || !mongoose.Types.ObjectId.isValid(vehicleId)) {
        errors.push("vehicleId is required and must be a valid ObjectId");
    }

    if (assignedMechanic !== undefined && assignedMechanic !== null && (typeof assignedMechanic !== "string" || !mongoose.Types.ObjectId.isValid(assignedMechanic))) {
        errors.push("assignedMechanic must be a valid ObjectId if provided");
    }

    if (complaints !== undefined) {
        if (!Array.isArray(complaints)) {
            errors.push("complaints must be an array of strings if provided");
        } else if (complaints.some((item) => typeof item !== "string" || !item.trim())) {
            errors.push("complaints must contain only non-empty strings");
        }
    }

    if (inspectionNotes !== undefined && inspectionNotes !== null && typeof inspectionNotes !== "string") {
        errors.push("inspectionNotes must be a string if provided");
    }

    if (estimatedCost !== undefined && estimatedCost !== null && Number.isNaN(Number(estimatedCost))) {
        errors.push("estimatedCost must be a number if provided");
    }

    if (priority !== undefined && priority !== null && !allowedPriorities.includes(priority)) {
        errors.push(`priority must be one of: ${allowedPriorities.join(", ")}`);
    }

    if (status !== undefined && status !== null && !allowedStatuses.includes(status)) {
        errors.push(`status must be one of: ${allowedStatuses.join(", ")}`);
    }

    if (expectedDeliveryDate !== undefined && expectedDeliveryDate !== null && Number.isNaN(new Date(expectedDeliveryDate).getTime())) {
        errors.push("expectedDeliveryDate must be a valid date if provided");
    }

    if (errors.length) {
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            details: errors,
        });
    }

    next();
}
