import mongoose from "mongoose";

export default function validateCustomer(req, res, next) {
    const errors = [];
    const { garageId, firstName, lastName, email, phone, address, notes } = req.body || {};

    if (!garageId || typeof garageId !== "string" || !mongoose.Types.ObjectId.isValid(garageId)) {
        errors.push("garageId is required and must be a valid ObjectId");
    }

    if (!firstName || typeof firstName !== "string" || firstName.trim().length < 2) {
        errors.push("firstName must be a string with at least 2 characters");
    }

    if (lastName !== undefined && lastName !== null && typeof lastName !== "string") {
        errors.push("lastName must be a string if provided");
    }

    if (email !== undefined && email !== null && typeof email !== "string") {
        errors.push("email must be a string if provided");
    }

    if (phone === undefined || phone === null || typeof phone !== "string" || phone.trim().length < 7) {
        errors.push("phone is required and must be at least 7 characters long");
    }

    if (address !== undefined && address !== null && typeof address !== "string") {
        errors.push("address must be a string if provided");
    }

    if (notes !== undefined && notes !== null && typeof notes !== "string") {
        errors.push("notes must be a string if provided");
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