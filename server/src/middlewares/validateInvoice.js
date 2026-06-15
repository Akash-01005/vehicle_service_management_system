import mongoose from "mongoose";

const allowedPaymentStatuses = ["pending", "paid", "partially_paid"];
const allowedPaymentMethods = ["cash", "card", "upi", "bank_transfer"];

export default function validateInvoice(req, res, next) {
    const errors = [];
    const { garageId, customerId, vehicleId, jobCardId, invoiceNumber, labourCharge, partsCharge, taxAmount, discountAmount, totalAmount, paymentStatus, paymentMethod } = req.body || {};

    if (garageId !== undefined && garageId !== null && (typeof garageId !== "string" || !mongoose.Types.ObjectId.isValid(garageId))) {
        errors.push("garageId must be a valid ObjectId if provided");
    }

    if (!customerId || typeof customerId !== "string" || !mongoose.Types.ObjectId.isValid(customerId)) {
        errors.push("customerId is required and must be a valid ObjectId");
    }

    if (!vehicleId || typeof vehicleId !== "string" || !mongoose.Types.ObjectId.isValid(vehicleId)) {
        errors.push("vehicleId is required and must be a valid ObjectId");
    }

    if (!jobCardId || typeof jobCardId !== "string" || !mongoose.Types.ObjectId.isValid(jobCardId)) {
        errors.push("jobCardId is required and must be a valid ObjectId");
    }

    if (invoiceNumber !== undefined && invoiceNumber !== null && typeof invoiceNumber !== "string") {
        errors.push("invoiceNumber must be a string if provided");
    }

    if (labourCharge !== undefined && labourCharge !== null && Number.isNaN(Number(labourCharge))) {
        errors.push("labourCharge must be a number if provided");
    }

    if (partsCharge !== undefined && partsCharge !== null && Number.isNaN(Number(partsCharge))) {
        errors.push("partsCharge must be a number if provided");
    }

    if (taxAmount !== undefined && taxAmount !== null && Number.isNaN(Number(taxAmount))) {
        errors.push("taxAmount must be a number if provided");
    }

    if (discountAmount !== undefined && discountAmount !== null && Number.isNaN(Number(discountAmount))) {
        errors.push("discountAmount must be a number if provided");
    }

    if (totalAmount === undefined || totalAmount === null || Number.isNaN(Number(totalAmount))) {
        errors.push("totalAmount is required and must be a number");
    }

    if (paymentStatus !== undefined && paymentStatus !== null && !allowedPaymentStatuses.includes(paymentStatus)) {
        errors.push(`paymentStatus must be one of: ${allowedPaymentStatuses.join(", ")}`);
    }

    if (paymentMethod !== undefined && paymentMethod !== null && !allowedPaymentMethods.includes(paymentMethod)) {
        errors.push(`paymentMethod must be one of: ${allowedPaymentMethods.join(", ")}`);
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
