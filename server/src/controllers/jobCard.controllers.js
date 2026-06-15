import jobCardModel from "../models/jobCard.model.js";
import userModel from "../models/user.model.js";
import customerModel from "../models/customer.model.js";
import vehicleModel from "../models/vechicle.model.js";

const serializeJobCard = (jobCard) => {
    const plainJobCard = jobCard.toObject ? jobCard.toObject() : jobCard;
    const { __v, ...safeJobCard } = plainJobCard;
    return safeJobCard;
};

const getCurrentUser = async (userID) => {
    return userModel.findById(userID).select("role garageId isActive");
};

const canManageJobCards = (role) => role === "admin" || role === "service_advisor";
const canViewAssignedJobs = (role) => role === "mechanic";
const isAdmin = (role) => role === "admin";

const validateGarageOwnership = async (currentUser, garageId, customerId, vehicleId, assignedMechanicId = null) => {
    const [customer, vehicle, assignedMechanic] = await Promise.all([
        customerModel.findById(customerId),
        vehicleModel.findById(vehicleId),
        assignedMechanicId ? userModel.findById(assignedMechanicId).select("role garageId isActive") : Promise.resolve(null),
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

    if (customer.garageId.toString() !== garageId.toString() || vehicle.garageId.toString() !== garageId.toString()) {
        const error = new Error("Forbidden!! Customer and vehicle must belong to the same garage");
        error.statusCode = 403;
        throw error;
    }

    if (vehicle.customerId.toString() !== customer._id.toString()) {
        const error = new Error("Vehicle does not belong to the selected customer");
        error.statusCode = 400;
        throw error;
    }

    if (assignedMechanicId) {
        if (!assignedMechanic) {
            const error = new Error("Assigned mechanic not found!!");
            error.statusCode = 404;
            throw error;
        }

        if (!assignedMechanic.isActive) {
            const error = new Error("Assigned mechanic is not active!!");
            error.statusCode = 400;
            throw error;
        }

        if (assignedMechanic.garageId.toString() !== garageId.toString() && !isAdmin(currentUser.role)) {
            const error = new Error("Forbidden!! Assigned mechanic must belong to your garage");
            error.statusCode = 403;
            throw error;
        }

        if (assignedMechanic.role !== "mechanic" && !isAdmin(currentUser.role)) {
            const error = new Error("Assigned user must be a mechanic");
            error.statusCode = 400;
            throw error;
        }
    }

    if (currentUser.role !== "admin" && currentUser.garageId.toString() !== garageId.toString()) {
        const error = new Error("Forbidden!! You can only manage job cards for your own garage");
        error.statusCode = 403;
        throw error;
    }

    return { customer, vehicle, assignedMechanic };
};

const getJobCardScope = async (currentUser, jobCardId) => {
    const jobCard = await jobCardModel.findById(jobCardId);

    if (!jobCard) {
        const error = new Error("Job card not found!!");
        error.statusCode = 404;
        throw error;
    }

    if (currentUser.role !== "admin" && jobCard.garageId.toString() !== currentUser.garageId.toString()) {
        const error = new Error("Forbidden!! You can only access job cards in your own garage");
        error.statusCode = 403;
        throw error;
    }

    return jobCard;
};

export const createJobCard = async (req, res, next) => {
    try {
        const currentUser = await getCurrentUser(req.userID);

        if (!currentUser || !canManageJobCards(currentUser.role)) {
            const error = new Error("Forbidden!! You do not have access to create job card");
            error.statusCode = 403;
            throw error;
        }

        const { garageId, customerId, vehicleId, assignedMechanic, complaints, inspectionNotes, estimatedCost, priority, status, expectedDeliveryDate } = req.body;
        const effectiveGarageId = currentUser.role === "admin" && garageId ? garageId : currentUser.garageId;

        await validateGarageOwnership(currentUser, effectiveGarageId, customerId, vehicleId, assignedMechanic);

        const existingJobCard = await jobCardModel.findOne({ vehicleId, status: { $ne: "cancelled" } });
        if (existingJobCard) {
            const error = new Error("Job card already exists for this vehicle!!");
            error.statusCode = 409;
            throw error;
        }

        const jobCard = await jobCardModel.create({
            garageId: effectiveGarageId,
            customerId,
            vehicleId,
            assignedMechanic: assignedMechanic || null,
            complaints,
            inspectionNotes,
            estimatedCost,
            priority,
            status,
            expectedDeliveryDate,
        });

        return res.status(201).json({
            message: "Job card created successfully...",
            jobCard: serializeJobCard(jobCard),
        });
    } catch (error) {
        console.error("Error creating job card:", error);
        next(error);
    }
};

export const listJobCards = async (req, res, next) => {
    try {
        const currentUser = await getCurrentUser(req.userID);

        if (!currentUser) {
            const error = new Error("Unauthorized!!");
            error.statusCode = 401;
            throw error;
        }

        const query = currentUser.role === "admin" && req.query.garageId
            ? { garageId: req.query.garageId }
            : { garageId: currentUser.garageId };

        if (currentUser.role === "mechanic") {
            query.assignedMechanic = currentUser._id;
        }

        if (req.query.customerId) {
            query.customerId = req.query.customerId;
        }

        if (req.query.vehicleId) {
            query.vehicleId = req.query.vehicleId;
        }

        if (req.query.status) {
            query.status = req.query.status;
        }

        const jobCards = await jobCardModel.find(query).sort({ createdAt: -1 });

        return res.status(200).json({
            message: "Job cards fetched successfully...",
            jobCards: jobCards.map(serializeJobCard),
        });
    } catch (error) {
        console.error("Error listing job cards:", error);
        next(error);
    }
};

export const getJobCardById = async (req, res, next) => {
    try {
        const currentUser = await getCurrentUser(req.userID);

        if (!currentUser) {
            const error = new Error("Unauthorized!!");
            error.statusCode = 401;
            throw error;
        }

        const jobCard = await getJobCardScope(currentUser, req.params.jobCardId);

        if (currentUser.role === "mechanic" && jobCard.assignedMechanic?.toString() !== currentUser._id.toString()) {
            const error = new Error("Forbidden!! You can only access your assigned job cards");
            error.statusCode = 403;
            throw error;
        }

        return res.status(200).json({
            message: "Job card fetched successfully...",
            jobCard: serializeJobCard(jobCard),
        });
    } catch (error) {
        console.error("Error fetching job card:", error);
        next(error);
    }
};

export const updateJobCard = async (req, res, next) => {
    try {
        const currentUser = await getCurrentUser(req.userID);

        if (!currentUser) {
            const error = new Error("Unauthorized!!");
            error.statusCode = 401;
            throw error;
        }

        const jobCard = await getJobCardScope(currentUser, req.params.jobCardId);
        const { garageId, customerId, vehicleId, assignedMechanic, complaints, inspectionNotes, estimatedCost, priority, status, expectedDeliveryDate } = req.body;
        const updateData = {};

        if (currentUser.role === "mechanic") {
            if (inspectionNotes !== undefined) updateData.inspectionNotes = inspectionNotes;
            if (status !== undefined) updateData.status = status;
        } else {
            if (garageId !== undefined) updateData.garageId = garageId;
            if (customerId !== undefined) updateData.customerId = customerId;
            if (vehicleId !== undefined) updateData.vehicleId = vehicleId;
            if (assignedMechanic !== undefined) updateData.assignedMechanic = assignedMechanic;
            if (complaints !== undefined) updateData.complaints = complaints;
            if (inspectionNotes !== undefined) updateData.inspectionNotes = inspectionNotes;
            if (estimatedCost !== undefined) updateData.estimatedCost = estimatedCost;
            if (priority !== undefined) updateData.priority = priority;
            if (status !== undefined) updateData.status = status;
            if (expectedDeliveryDate !== undefined) updateData.expectedDeliveryDate = expectedDeliveryDate;
        }

        const effectiveGarageId = updateData.garageId || jobCard.garageId;
        const effectiveCustomerId = updateData.customerId || jobCard.customerId;
        const effectiveVehicleId = updateData.vehicleId || jobCard.vehicleId;
        const effectiveAssignedMechanic = updateData.assignedMechanic || jobCard.assignedMechanic;

        if (currentUser.role !== "mechanic") {
            await validateGarageOwnership(currentUser, effectiveGarageId, effectiveCustomerId, effectiveVehicleId, effectiveAssignedMechanic);
        }

        if (currentUser.role === "mechanic") {
            if (jobCard.assignedMechanic?.toString() !== currentUser._id.toString()) {
                const error = new Error("Forbidden!! You can only update your assigned job cards");
                error.statusCode = 403;
                throw error;
            }
        }

        const updatedJobCard = await jobCardModel.findByIdAndUpdate(jobCard._id, updateData, {
            new: true,
            runValidators: true,
        });

        return res.status(200).json({
            message: "Job card updated successfully...",
            jobCard: serializeJobCard(updatedJobCard),
        });
    } catch (error) {
        console.error("Error updating job card:", error);
        next(error);
    }
};

export const deleteJobCard = async (req, res, next) => {
    try {
        const currentUser = await getCurrentUser(req.userID);

        if (!currentUser || !isAdmin(currentUser.role)) {
            const error = new Error("Forbidden!! Only admin can delete job card");
            error.statusCode = 403;
            throw error;
        }

        const jobCard = await jobCardModel.findByIdAndDelete(req.params.jobCardId);

        if (!jobCard) {
            const error = new Error("Job card not found!!");
            error.statusCode = 404;
            throw error;
        }

        return res.status(200).json({
            message: "Job card deleted successfully...",
        });
    } catch (error) {
        console.error("Error deleting job card:", error);
        next(error);
    }
};
