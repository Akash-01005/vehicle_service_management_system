import serviceRecordModel from "../models/serviceRecord.model.js";
import userModel from "../models/user.model.js";
import vehicleModel from "../models/vechicle.model.js";
import jobCardModel from "../models/jobCard.model.js";

const serializeServiceRecord = (serviceRecord) => {
    const plainServiceRecord = serviceRecord.toObject ? serviceRecord.toObject() : serviceRecord;
    const { __v, ...safeServiceRecord } = plainServiceRecord;
    return safeServiceRecord;
};

const getCurrentUser = async (userID) => {
    return userModel.findById(userID).select("role garageId isActive");
};

const canManageServiceRecords = (role) => role === "admin" || role === "service_advisor" || role === "mechanic";
const isAdmin = (role) => role === "admin";

const loadVehicleAndJobCard = async (vehicleId, jobCardId) => {
    const [vehicle, jobCard] = await Promise.all([
        vehicleModel.findById(vehicleId),
        jobCardModel.findById(jobCardId),
    ]);

    return { vehicle, jobCard };
};

const ensureServiceRecordScope = async (currentUser, garageId, vehicleId, jobCardId, options = {}) => {
    const { allowMissingJobCardCompleted = false } = options;
    const { vehicle, jobCard } = await loadVehicleAndJobCard(vehicleId, jobCardId);

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

    if (vehicle.garageId.toString() !== garageId.toString() || jobCard.garageId.toString() !== garageId.toString()) {
        const error = new Error("Forbidden!! Vehicle and job card must belong to the same garage");
        error.statusCode = 403;
        throw error;
    }

    if (!allowMissingJobCardCompleted && jobCard.status !== "completed") {
        const error = new Error("Job card must be completed before creating service record");
        error.statusCode = 400;
        throw error;
    }

    if (vehicle.customerId.toString() !== jobCard.customerId.toString()) {
        const error = new Error("Vehicle and job card customer do not match");
        error.statusCode = 400;
        throw error;
    }

    if (currentUser.role !== "admin" && garageId.toString() !== currentUser.garageId.toString()) {
        const error = new Error("Forbidden!! You can only manage service records for your own garage");
        error.statusCode = 403;
        throw error;
    }

    return { vehicle, jobCard };
};

export const createServiceRecord = async (req, res, next) => {
    try {
        const currentUser = await getCurrentUser(req.userID);

        if (!currentUser || !canManageServiceRecords(currentUser.role)) {
            const error = new Error("Forbidden!! You do not have access to create service record");
            error.statusCode = 403;
            throw error;
        }

        const { garageId, vehicleId, jobCardId, serviceDate, odometerReading, servicesPerformed, remarks, nextServiceDate, nextServiceKm } = req.body;
        const effectiveGarageId = currentUser.role === "admin" && garageId ? garageId : currentUser.garageId;

        await ensureServiceRecordScope(currentUser, effectiveGarageId, vehicleId, jobCardId);

        const existingServiceRecord = await serviceRecordModel.findOne({ jobCardId });
        if (existingServiceRecord) {
            const error = new Error("Service record already exists for this job card!!");
            error.statusCode = 409;
            throw error;
        }

        const serviceRecord = await serviceRecordModel.create({
            garageId: effectiveGarageId,
            vehicleId,
            jobCardId,
            serviceDate,
            odometerReading,
            servicesPerformed,
            remarks,
            nextServiceDate,
            nextServiceKm,
        });

        return res.status(201).json({
            message: "Service record created successfully...",
            serviceRecord: serializeServiceRecord(serviceRecord),
        });
    } catch (error) {
        console.error("Error creating service record:", error);
        next(error);
    }
};

export const listServiceRecords = async (req, res, next) => {
    try {
        const currentUser = await getCurrentUser(req.userID);

        if (!currentUser || !canManageServiceRecords(currentUser.role)) {
            const error = new Error("Forbidden!! You do not have access to service record list");
            error.statusCode = 403;
            throw error;
        }

        const query = {};

        if (currentUser.role === "admin" && req.query.garageId) {
            query.garageId = req.query.garageId;
        } else {
            query.garageId = currentUser.garageId;
        }

        if (req.query.vehicleId) {
            query.vehicleId = req.query.vehicleId;
        }

        if (req.query.jobCardId) {
            query.jobCardId = req.query.jobCardId;
        }

        const serviceRecords = await serviceRecordModel.find(query).sort({ createdAt: -1 });

        return res.status(200).json({
            message: "Service records fetched successfully...",
            serviceRecords: serviceRecords.map(serializeServiceRecord),
        });
    } catch (error) {
        console.error("Error listing service records:", error);
        next(error);
    }
};

export const getServiceRecordById = async (req, res, next) => {
    try {
        const currentUser = await getCurrentUser(req.userID);

        if (!currentUser || !canManageServiceRecords(currentUser.role)) {
            const error = new Error("Forbidden!! You do not have access to service record data");
            error.statusCode = 403;
            throw error;
        }

        const serviceRecord = await serviceRecordModel.findById(req.params.serviceRecordId);

        if (!serviceRecord) {
            const error = new Error("Service record not found!!");
            error.statusCode = 404;
            throw error;
        }

        if (currentUser.role !== "admin" && serviceRecord.garageId.toString() !== currentUser.garageId.toString()) {
            const error = new Error("Forbidden!! You can only view service records in your own garage");
            error.statusCode = 403;
            throw error;
        }

        return res.status(200).json({
            message: "Service record fetched successfully...",
            serviceRecord: serializeServiceRecord(serviceRecord),
        });
    } catch (error) {
        console.error("Error fetching service record:", error);
        next(error);
    }
};

export const updateServiceRecord = async (req, res, next) => {
    try {
        const currentUser = await getCurrentUser(req.userID);

        if (!currentUser || !canManageServiceRecords(currentUser.role)) {
            const error = new Error("Forbidden!! You do not have access to update service record");
            error.statusCode = 403;
            throw error;
        }

        const serviceRecord = await serviceRecordModel.findById(req.params.serviceRecordId);

        if (!serviceRecord) {
            const error = new Error("Service record not found!!");
            error.statusCode = 404;
            throw error;
        }

        if (currentUser.role !== "admin" && serviceRecord.garageId.toString() !== currentUser.garageId.toString()) {
            const error = new Error("Forbidden!! You can only update service records in your own garage");
            error.statusCode = 403;
            throw error;
        }

        const { garageId, vehicleId, jobCardId, serviceDate, odometerReading, servicesPerformed, remarks, nextServiceDate, nextServiceKm } = req.body;
        const updateData = {};

        const effectiveGarageId = currentUser.role === "admin" && garageId ? garageId : serviceRecord.garageId;
        const effectiveVehicleId = vehicleId ?? serviceRecord.vehicleId;
        const effectiveJobCardId = jobCardId ?? serviceRecord.jobCardId;

        if (garageId !== undefined) updateData.garageId = garageId;
        if (vehicleId !== undefined) updateData.vehicleId = vehicleId;
        if (jobCardId !== undefined) updateData.jobCardId = jobCardId;
        if (serviceDate !== undefined) updateData.serviceDate = serviceDate;
        if (odometerReading !== undefined) updateData.odometerReading = odometerReading;
        if (servicesPerformed !== undefined) updateData.servicesPerformed = servicesPerformed;
        if (remarks !== undefined) updateData.remarks = remarks;
        if (nextServiceDate !== undefined) updateData.nextServiceDate = nextServiceDate;
        if (nextServiceKm !== undefined) updateData.nextServiceKm = nextServiceKm;

        await ensureServiceRecordScope(currentUser, effectiveGarageId, effectiveVehicleId, effectiveJobCardId, { allowMissingJobCardCompleted: true });

        const duplicateServiceRecord = await serviceRecordModel.findOne({
            jobCardId: effectiveJobCardId,
            _id: { $ne: serviceRecord._id },
        });

        if (duplicateServiceRecord) {
            const error = new Error("Service record already exists for this job card!!");
            error.statusCode = 409;
            throw error;
        }

        const updatedServiceRecord = await serviceRecordModel.findByIdAndUpdate(serviceRecord._id, updateData, {
            new: true,
            runValidators: true,
        });

        return res.status(200).json({
            message: "Service record updated successfully...",
            serviceRecord: serializeServiceRecord(updatedServiceRecord),
        });
    } catch (error) {
        console.error("Error updating service record:", error);
        next(error);
    }
};

export const deleteServiceRecord = async (req, res, next) => {
    try {
        const currentUser = await getCurrentUser(req.userID);

        if (!currentUser || !isAdmin(currentUser.role)) {
            const error = new Error("Forbidden!! Only admin can delete service record");
            error.statusCode = 403;
            throw error;
        }

        const serviceRecord = await serviceRecordModel.findByIdAndDelete(req.params.serviceRecordId);

        if (!serviceRecord) {
            const error = new Error("Service record not found!!");
            error.statusCode = 404;
            throw error;
        }

        return res.status(200).json({
            message: "Service record deleted successfully...",
        });
    } catch (error) {
        console.error("Error deleting service record:", error);
        next(error);
    }
};
