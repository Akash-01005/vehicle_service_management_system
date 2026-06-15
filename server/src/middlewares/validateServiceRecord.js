import mongoose from "mongoose";

export default function validateServiceRecord(req, res, next) {
    const errors = [];
    const { garageId, vehicleId, jobCardId, serviceDate, odometerReading, servicesPerformed, remarks, nextServiceDate, nextServiceKm } = req.body || {};

    if (garageId !== undefined && garageId !== null && (typeof garageId !== "string" || !mongoose.Types.ObjectId.isValid(garageId))) {
        errors.push("garageId must be a valid ObjectId if provided");
    }

    if (!vehicleId || typeof vehicleId !== "string" || !mongoose.Types.ObjectId.isValid(vehicleId)) {
        errors.push("vehicleId is required and must be a valid ObjectId");
    }

    if (!jobCardId || typeof jobCardId !== "string" || !mongoose.Types.ObjectId.isValid(jobCardId)) {
        errors.push("jobCardId is required and must be a valid ObjectId");
    }

    if (serviceDate !== undefined && serviceDate !== null && Number.isNaN(new Date(serviceDate).getTime())) {
        errors.push("serviceDate must be a valid date if provided");
    }

    if (odometerReading === undefined || odometerReading === null || Number.isNaN(Number(odometerReading))) {
        errors.push("odometerReading is required and must be a number");
    }

    if (servicesPerformed !== undefined) {
        if (!Array.isArray(servicesPerformed)) {
            errors.push("servicesPerformed must be an array of strings if provided");
        } else if (servicesPerformed.some((item) => typeof item !== "string" || !item.trim())) {
            errors.push("servicesPerformed must contain only non-empty strings");
        }
    }

    if (remarks !== undefined && remarks !== null && typeof remarks !== "string") {
        errors.push("remarks must be a string if provided");
    }

    if (nextServiceDate !== undefined && nextServiceDate !== null && Number.isNaN(new Date(nextServiceDate).getTime())) {
        errors.push("nextServiceDate must be a valid date if provided");
    }

    if (nextServiceKm !== undefined && nextServiceKm !== null && Number.isNaN(Number(nextServiceKm))) {
        errors.push("nextServiceKm must be a number if provided");
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
