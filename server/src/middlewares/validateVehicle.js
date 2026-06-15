import mongoose from "mongoose";

const allowedFuelTypes = ["Petrol", "Diesel", "Electric", "Hybrid", "CNG"];

export default function validateVehicle(req, res, next) {
    const errors = [];
    const { garageId, customerId, registrationNumber, brand, model, year, fuelType, engineNumber, chassisNumber, odometerReading, color } = req.body || {};

    if (!garageId || typeof garageId !== "string" || !mongoose.Types.ObjectId.isValid(garageId)) {
        errors.push("garageId is required and must be a valid ObjectId");
    }

    if (!customerId || typeof customerId !== "string" || !mongoose.Types.ObjectId.isValid(customerId)) {
        errors.push("customerId is required and must be a valid ObjectId");
    }

    if (!registrationNumber || typeof registrationNumber !== "string" || registrationNumber.trim().length < 3) {
        errors.push("registrationNumber must be a string with at least 3 characters");
    }

    if (!brand || typeof brand !== "string" || brand.trim().length < 2) {
        errors.push("brand must be a string with at least 2 characters");
    }

    if (!model || typeof model !== "string" || model.trim().length < 1) {
        errors.push("model must be a non-empty string");
    }

    if (year !== undefined && year !== null && (!Number.isInteger(Number(year)) || Number(year) < 1900)) {
        errors.push("year must be a valid number greater than or equal to 1900");
    }

    if (!fuelType || typeof fuelType !== "string" || !allowedFuelTypes.includes(fuelType)) {
        errors.push(`fuelType must be one of: ${allowedFuelTypes.join(", ")}`);
    }

    if (engineNumber !== undefined && engineNumber !== null && typeof engineNumber !== "string") {
        errors.push("engineNumber must be a string if provided");
    }

    if (chassisNumber !== undefined && chassisNumber !== null && typeof chassisNumber !== "string") {
        errors.push("chassisNumber must be a string if provided");
    }

    if (odometerReading !== undefined && odometerReading !== null && isNaN(Number(odometerReading))) {
        errors.push("odometerReading must be a number if provided");
    }

    if (color !== undefined && color !== null && typeof color !== "string") {
        errors.push("color must be a string if provided");
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
