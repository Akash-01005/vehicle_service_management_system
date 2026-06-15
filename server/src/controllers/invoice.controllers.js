import invoiceModel from "../models/invoice.model.js";
import userModel from "../models/user.model.js";
import customerModel from "../models/customer.model.js";
import vehicleModel from "../models/vechicle.model.js";
import jobCardModel from "../models/jobCard.model.js";
import serviceRecordModel from "../models/serviceRecord.model.js";
import garageModel from "../models/garage.model.js";
import { createInvoicePdfBuffer } from "../libs/invoicePdf.js";
import {
    buildInvoicePdfKey,
    deleteInvoicePdfFromS3,
    getInvoicePdfStreamFromS3,
    uploadInvoicePdfToS3,
} from "../libs/invoiceStorage.js";

const serializeInvoice = (invoice) => {
    const plainInvoice = invoice.toObject ? invoice.toObject() : invoice;
    const { __v, ...safeInvoice } = plainInvoice;
    return safeInvoice;
};

const getCurrentUser = async (userID) => {
    return userModel.findById(userID).select("role garageId isActive");
};

const canManageInvoices = (role) => role === "admin" || role === "service_advisor";
const isAdmin = (role) => role === "admin";

const buildInvoiceNumber = () => {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
    const timePart = now.getTime().toString().slice(-6);
    return `INV-${datePart}-${timePart}`;
};

const getInvoiceScope = async (currentUser, invoiceId) => {
    const invoice = await invoiceModel.findById(invoiceId);

    if (!invoice) {
        const error = new Error("Invoice not found!!");
        error.statusCode = 404;
        throw error;
    }

    if (currentUser.role !== "admin" && invoice.garageId.toString() !== currentUser.garageId.toString()) {
        const error = new Error("Forbidden!! You can only access invoices in your own garage");
        error.statusCode = 403;
        throw error;
    }

    return invoice;
};

const validateInvoiceDependencies = async (currentUser, garageId, customerId, vehicleId, jobCardId) => {
    const [customer, vehicle, jobCard, serviceRecord] = await Promise.all([
        customerModel.findById(customerId),
        vehicleModel.findById(vehicleId),
        jobCardModel.findById(jobCardId),
        serviceRecordModel.findOne({ jobCardId }),
    ]);

    if (!customer) {
        const error = new Error("Customer not found!!");
        error.statusCode = 404;
        throw error;
    }

    if (!vehicle) {
        const error = new Error("Vehicle not found!!");
        error.statusCode = 404;
        throw error;
    }

    if (!jobCard) {
        const error = new Error("Job card not found!!");
        error.statusCode = 404;
        throw error;
    }

    if (!serviceRecord) {
        const error = new Error("Service record not found for this job card!!");
        error.statusCode = 400;
        throw error;
    }

    if (customer.garageId.toString() !== garageId.toString() || vehicle.garageId.toString() !== garageId.toString() || jobCard.garageId.toString() !== garageId.toString() || serviceRecord.garageId.toString() !== garageId.toString()) {
        const error = new Error("Forbidden!! Customer, vehicle, job card, and service record must belong to the same garage");
        error.statusCode = 403;
        throw error;
    }

    if (vehicle.customerId.toString() !== customer._id.toString() || jobCard.customerId.toString() !== customer._id.toString()) {
        const error = new Error("Customer does not match the selected vehicle or job card");
        error.statusCode = 400;
        throw error;
    }

    if (jobCard.vehicleId.toString() !== vehicle._id.toString() || serviceRecord.vehicleId.toString() !== vehicle._id.toString()) {
        const error = new Error("Vehicle does not match the selected job card or service record");
        error.statusCode = 400;
        throw error;
    }

    if (jobCard.status !== "completed") {
        const error = new Error("Job card must be completed before creating invoice");
        error.statusCode = 400;
        throw error;
    }

    if (currentUser.role !== "admin" && garageId.toString() !== currentUser.garageId.toString()) {
        const error = new Error("Forbidden!! You can only manage invoices for your own garage");
        error.statusCode = 403;
        throw error;
    }

    return { customer, vehicle, jobCard, serviceRecord };
};

const loadInvoicePdfContext = async (invoice) => {
    const [customer, vehicle, jobCard, serviceRecord, garage] = await Promise.all([
        customerModel.findById(invoice.customerId),
        vehicleModel.findById(invoice.vehicleId),
        jobCardModel.findById(invoice.jobCardId),
        serviceRecordModel.findOne({ jobCardId: invoice.jobCardId }),
        garageModel.findById(invoice.garageId),
    ]);

    if (!customer || !vehicle || !jobCard || !serviceRecord || !garage) {
        const error = new Error("Unable to process invoice pdf because related data is missing");
        error.statusCode = 400;
        throw error;
    }

    return { customer, vehicle, jobCard, serviceRecord, garage };
};

const uploadInvoicePdf = async (invoice) => {
    const context = await loadInvoicePdfContext(invoice);
    const pdfBuffer = await createInvoicePdfBuffer({
        invoice,
        ...context,
    });
    const pdfKey = buildInvoicePdfKey(invoice.garageId, invoice.invoiceNumber);

    return uploadInvoicePdfToS3({ key: pdfKey, buffer: pdfBuffer });
};

const isInvoicePdfDataChanged = (updateData) => {
    const pdfFields = ["garageId", "customerId", "vehicleId", "jobCardId", "invoiceNumber", "labourCharge", "partsCharge", "taxAmount", "discountAmount", "totalAmount", "paymentStatus", "paymentMethod"];
    return pdfFields.some((field) => Object.prototype.hasOwnProperty.call(updateData, field));
};

const writeInvoicePdfResponse = async (res, invoice, pdfKey) => {
    const pdfResponse = await getInvoicePdfStreamFromS3(pdfKey);

    if (!pdfResponse.Body) {
        const error = new Error("Invoice pdf file is empty");
        error.statusCode = 500;
        throw error;
    }

    const fileName = `invoice-${invoice.invoiceNumber}.pdf`.replace(/[^a-zA-Z0-9._-]/g, "-");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    pdfResponse.Body.pipe(res);
};

const normalizeInvoiceUpdate = (invoice, body) => {
    const updateData = {};
    const { garageId, customerId, vehicleId, jobCardId, invoiceNumber, labourCharge, partsCharge, taxAmount, discountAmount, totalAmount, paymentStatus, paymentMethod } = body;

    if (garageId !== undefined) updateData.garageId = garageId;
    if (customerId !== undefined) updateData.customerId = customerId;
    if (vehicleId !== undefined) updateData.vehicleId = vehicleId;
    if (jobCardId !== undefined) updateData.jobCardId = jobCardId;
    if (invoiceNumber !== undefined) updateData.invoiceNumber = invoiceNumber;
    if (labourCharge !== undefined) updateData.labourCharge = labourCharge;
    if (partsCharge !== undefined) updateData.partsCharge = partsCharge;
    if (taxAmount !== undefined) updateData.taxAmount = taxAmount;
    if (discountAmount !== undefined) updateData.discountAmount = discountAmount;
    if (totalAmount !== undefined) updateData.totalAmount = totalAmount;
    if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;

    if (!updateData.invoiceNumber && invoiceNumber === undefined && !invoice.invoiceNumber) {
        updateData.invoiceNumber = buildInvoiceNumber();
    }

    return updateData;
};

export const createInvoice = async (req, res, next) => {
    try {
        const currentUser = await getCurrentUser(req.userID);

        if (!currentUser || !canManageInvoices(currentUser.role)) {
            const error = new Error("Forbidden!! You do not have access to create invoice");
            error.statusCode = 403;
            throw error;
        }

        const { garageId, customerId, vehicleId, jobCardId, invoiceNumber, labourCharge, partsCharge, taxAmount, discountAmount, totalAmount, paymentStatus, paymentMethod } = req.body;
        const effectiveGarageId = currentUser.role === "admin" && garageId ? garageId : currentUser.garageId;

        await validateInvoiceDependencies(currentUser, effectiveGarageId, customerId, vehicleId, jobCardId);

        const existingInvoice = await invoiceModel.findOne({ jobCardId });
        if (existingInvoice) {
            const error = new Error("Invoice already exists for this job card!!");
            error.statusCode = 409;
            throw error;
        }

        const finalInvoiceNumber = invoiceNumber || buildInvoiceNumber();
        const duplicateInvoiceNumber = await invoiceModel.findOne({ invoiceNumber: finalInvoiceNumber });
        if (duplicateInvoiceNumber) {
            const error = new Error("Invoice number already exists!!");
            error.statusCode = 409;
            throw error;
        }

        const invoiceData = {
            garageId: effectiveGarageId,
            customerId,
            vehicleId,
            jobCardId,
            invoiceNumber: finalInvoiceNumber,
            labourCharge: labourCharge ?? 0,
            partsCharge: partsCharge ?? 0,
            taxAmount: taxAmount ?? 0,
            discountAmount: discountAmount ?? 0,
            totalAmount,
            paymentStatus: paymentStatus || "pending",
            paymentMethod,
        };

        const pdfAsset = await uploadInvoicePdf({
            ...invoiceData,
            createdAt: new Date(),
        });

        let invoice;

        try {
            invoice = await invoiceModel.create({
                ...invoiceData,
                pdfKey: pdfAsset.key,
                pdfUrl: pdfAsset.url,
                pdfUploadedAt: new Date(),
            });
        } catch (createError) {
            await deleteInvoicePdfFromS3(pdfAsset.key);
            throw createError;
        }

        return res.status(201).json({
            message: "Invoice created successfully...",
            invoice: serializeInvoice(invoice),
        });
    } catch (error) {
        console.error("Error creating invoice:", error);
        next(error);
    }
};

export const listInvoices = async (req, res, next) => {
    try {
        const currentUser = await getCurrentUser(req.userID);

        if (!currentUser || !canManageInvoices(currentUser.role)) {
            const error = new Error("Forbidden!! You do not have access to invoice list");
            error.statusCode = 403;
            throw error;
        }

        const query = currentUser.role === "admin" && req.query.garageId
            ? { garageId: req.query.garageId }
            : { garageId: currentUser.garageId };

        if (req.query.customerId) query.customerId = req.query.customerId;
        if (req.query.vehicleId) query.vehicleId = req.query.vehicleId;
        if (req.query.jobCardId) query.jobCardId = req.query.jobCardId;
        if (req.query.paymentStatus) query.paymentStatus = req.query.paymentStatus;

        const invoices = await invoiceModel.find(query).sort({ createdAt: -1 });

        return res.status(200).json({
            message: "Invoices fetched successfully...",
            invoices: invoices.map(serializeInvoice),
        });
    } catch (error) {
        console.error("Error listing invoices:", error);
        next(error);
    }
};

export const getInvoiceById = async (req, res, next) => {
    try {
        const currentUser = await getCurrentUser(req.userID);

        if (!currentUser || !canManageInvoices(currentUser.role)) {
            const error = new Error("Forbidden!! You do not have access to invoice data");
            error.statusCode = 403;
            throw error;
        }

        const invoice = await getInvoiceScope(currentUser, req.params.invoiceId);

        return res.status(200).json({
            message: "Invoice fetched successfully...",
            invoice: serializeInvoice(invoice),
        });
    } catch (error) {
        console.error("Error fetching invoice:", error);
        next(error);
    }
};

export const updateInvoice = async (req, res, next) => {
    try {
        const currentUser = await getCurrentUser(req.userID);

        if (!currentUser || !canManageInvoices(currentUser.role)) {
            const error = new Error("Forbidden!! You do not have access to update invoice");
            error.statusCode = 403;
            throw error;
        }

        const invoice = await getInvoiceScope(currentUser, req.params.invoiceId);
        const updateData = normalizeInvoiceUpdate(invoice, req.body);

        if (currentUser.role !== "admin" && updateData.garageId && updateData.garageId.toString() !== currentUser.garageId.toString()) {
            const error = new Error("Forbidden!! You can only update invoices in your own garage");
            error.statusCode = 403;
            throw error;
        }

        if (updateData.customerId || updateData.vehicleId || updateData.jobCardId || updateData.garageId) {
            const effectiveGarageId = updateData.garageId || invoice.garageId;
            const effectiveCustomerId = updateData.customerId || invoice.customerId;
            const effectiveVehicleId = updateData.vehicleId || invoice.vehicleId;
            const effectiveJobCardId = updateData.jobCardId || invoice.jobCardId;

            await validateInvoiceDependencies(currentUser, effectiveGarageId, effectiveCustomerId, effectiveVehicleId, effectiveJobCardId);
        }

        if (updateData.invoiceNumber) {
            const duplicateInvoiceNumber = await invoiceModel.findOne({
                invoiceNumber: updateData.invoiceNumber,
                _id: { $ne: invoice._id },
            });

            if (duplicateInvoiceNumber) {
                const error = new Error("Invoice number already exists!!");
                error.statusCode = 409;
                throw error;
            }
        }

        if (updateData.jobCardId) {
            const duplicateJobCardInvoice = await invoiceModel.findOne({
                jobCardId: updateData.jobCardId,
                _id: { $ne: invoice._id },
            });

            if (duplicateJobCardInvoice) {
                const error = new Error("Invoice already exists for this job card!!");
                error.statusCode = 409;
                throw error;
            }
        }

        let pdfAsset = null;
        const oldPdfKey = invoice.pdfKey;
        const shouldRefreshPdf = isInvoicePdfDataChanged(updateData);

        if (shouldRefreshPdf) {
            pdfAsset = await uploadInvoicePdf({
                ...invoice.toObject(),
                ...updateData,
            });

            updateData.pdfKey = pdfAsset.key;
            updateData.pdfUrl = pdfAsset.url;
            updateData.pdfUploadedAt = new Date();
        }

        let updatedInvoice;

        try {
            updatedInvoice = await invoiceModel.findByIdAndUpdate(invoice._id, updateData, {
                new: true,
                runValidators: true,
            });
        } catch (updateError) {
            if (pdfAsset) {
                await deleteInvoicePdfFromS3(pdfAsset.key);
            }
            throw updateError;
        }

        if (pdfAsset && oldPdfKey && oldPdfKey !== pdfAsset.key) {
            await deleteInvoicePdfFromS3(oldPdfKey);
        }

        return res.status(200).json({
            message: "Invoice updated successfully...",
            invoice: serializeInvoice(updatedInvoice),
        });
    } catch (error) {
        console.error("Error updating invoice:", error);
        next(error);
    }
};

export const deleteInvoice = async (req, res, next) => {
    try {
        const currentUser = await getCurrentUser(req.userID);

        if (!currentUser || !isAdmin(currentUser.role)) {
            const error = new Error("Forbidden!! Only admin can delete invoice");
            error.statusCode = 403;
            throw error;
        }

        const invoice = await invoiceModel.findByIdAndDelete(req.params.invoiceId);

        if (!invoice) {
            const error = new Error("Invoice not found!!");
            error.statusCode = 404;
            throw error;
        }

        if (invoice.pdfKey) {
            await deleteInvoicePdfFromS3(invoice.pdfKey);
        }

        return res.status(200).json({
            message: "Invoice deleted successfully...",
        });
    } catch (error) {
        console.error("Error deleting invoice:", error);
        next(error);
    }
};

export const downloadInvoicePdf = async (req, res, next) => {
    try {
        const currentUser = await getCurrentUser(req.userID);

        if (!currentUser || !canManageInvoices(currentUser.role)) {
            const error = new Error("Forbidden!! You do not have access to download invoice pdf");
            error.statusCode = 403;
            throw error;
        }

        const invoice = await getInvoiceScope(currentUser, req.params.invoiceId);

        if (invoice.pdfKey) {
            try {
                await writeInvoicePdfResponse(res, invoice, invoice.pdfKey);
                return;
            } catch (pdfError) {
                const statusCode = pdfError.$metadata?.httpStatusCode;
                if (statusCode !== 404 && pdfError.name !== "NoSuchKey" && pdfError.Code !== "NoSuchKey") {
                    throw pdfError;
                }
            }
        }

        const pdfAsset = await uploadInvoicePdf(invoice);

        const updatedInvoice = await invoiceModel.findByIdAndUpdate(invoice._id, {
            pdfKey: pdfAsset.key,
            pdfUrl: pdfAsset.url,
            pdfUploadedAt: new Date(),
        }, {
            new: true,
        });

        await writeInvoicePdfResponse(res, updatedInvoice, pdfAsset.key);
    } catch (error) {
        console.error("Error generating invoice pdf:", error);
        next(error);
    }
};
