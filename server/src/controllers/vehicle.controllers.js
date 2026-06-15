import vehicleModel from "../models/vechicle.model.js";
import userModel from "../models/user.model.js";
import customerModel from "../models/customer.model.js";

const serializeVehicle = (vehicle) => {
    const plainVehicle = vehicle.toObject ? vehicle.toObject() : vehicle;
    const { __v, ...safeVehicle } = plainVehicle;
    return safeVehicle;
};

const getCurrentUser = async (userID) => {
    return userModel.findById(userID).select("role garageId isActive");
};

const canManageVehicles = (role) => role === "admin" || role === "service_advisor";
const isAdmin = (role) => role === "admin";

export const createVehicle = async (req, res, next) => {
    try {
        const currentUser = await getCurrentUser(req.userID);

        if (!currentUser || !canManageVehicles(currentUser.role)) {
            const error = new Error("Forbidden!! You do not have access to create vehicle");
            error.statusCode = 403;
            throw error;
        }

        const { garageId, customerId, registrationNumber, brand, model, year, fuelType, engineNumber, chassisNumber, odometerReading, color } = req.body;

        if (currentUser.garageId?.toString() !== garageId?.toString() && !isAdmin(currentUser.role)) {
            const error = new Error("Forbidden!! You can only create vehicles for your own garage");
            error.statusCode = 403;
            throw error;
        }

        const customer = await customerModel.findById(customerId);
        if (!customer) {
            const error = new Error("Customer not found!!");
            error.statusCode = 404;
            throw error;
        }

        if (customer.garageId.toString() !== garageId.toString() && !isAdmin(currentUser.role)) {
            const error = new Error("Forbidden!! Customer does not belong to your garage");
            error.statusCode = 403;
            throw error;
        }

        const existingVehicle = await vehicleModel.findOne({
            registrationNumber: registrationNumber.toUpperCase().trim(),
        });

        if (existingVehicle) {
            const error = new Error("Vehicle already exists with this registration number!!");
            error.statusCode = 409;
            throw error;
        }

        const vehicle = await vehicleModel.create({
            garageId,
            customerId,
            registrationNumber,
            brand,
            model,
            year,
            fuelType,
            engineNumber,
            chassisNumber,
            odometerReading,
            color,
        });

        return res.status(201).json({
            message: "Vehicle created successfully...",
            vehicle: serializeVehicle(vehicle),
        });
    } catch (error) {
        console.error("Error creating vehicle:", error);
        next(error);
    }
};

export const listVehicles = async (req, res, next) => {
    try {
        const currentUser = await getCurrentUser(req.userID);

        if (!currentUser || !canManageVehicles(currentUser.role)) {
            const error = new Error("Forbidden!! You do not have access to vehicle list");
            error.statusCode = 403;
            throw error;
        }

        const query = { garageId: currentUser.garageId };

        if (currentUser.role === "admin" && req.query.garageId) {
            query.garageId = req.query.garageId;
        }

        if (req.query.customerId) {
            query.customerId = req.query.customerId;
        }

        const vehicles = await vehicleModel.find(query).sort({ createdAt: -1 });

        return res.status(200).json({
            message: "Vehicles fetched successfully...",
            vehicles: vehicles.map(serializeVehicle),
        });
    } catch (error) {
        console.error("Error listing vehicles:", error);
        next(error);
    }
};

export const getVehicleById = async (req, res, next) => {
    try {
        const currentUser = await getCurrentUser(req.userID);

        if (!currentUser || !canManageVehicles(currentUser.role)) {
            const error = new Error("Forbidden!! You do not have access to vehicle data");
            error.statusCode = 403;
            throw error;
        }

        const vehicle = await vehicleModel.findById(req.params.vehicleId);

        if (!vehicle) {
            const error = new Error("Vehicle not found!!");
            error.statusCode = 404;
            throw error;
        }

        if (currentUser.role !== "admin" && vehicle.garageId.toString() !== currentUser.garageId.toString()) {
            const error = new Error("Forbidden!! You can only view vehicles in your own garage");
            error.statusCode = 403;
            throw error;
        }

        return res.status(200).json({
            message: "Vehicle fetched successfully...",
            vehicle: serializeVehicle(vehicle),
        });
    } catch (error) {
        console.error("Error fetching vehicle:", error);
        next(error);
    }
};

export const updateVehicle = async (req, res, next) => {
    try {
        const currentUser = await getCurrentUser(req.userID);

        if (!currentUser || !canManageVehicles(currentUser.role)) {
            const error = new Error("Forbidden!! You do not have access to update vehicle");
            error.statusCode = 403;
            throw error;
        }

        const vehicle = await vehicleModel.findById(req.params.vehicleId);

        if (!vehicle) {
            const error = new Error("Vehicle not found!!");
            error.statusCode = 404;
            throw error;
        }

        if (currentUser.role !== "admin" && vehicle.garageId.toString() !== currentUser.garageId.toString()) {
            const error = new Error("Forbidden!! You can only update vehicles in your own garage");
            error.statusCode = 403;
            throw error;
        }

        const { garageId, customerId, registrationNumber, brand, model, year, fuelType, engineNumber, chassisNumber, odometerReading, color } = req.body;
        const updateData = {};

        if (garageId !== undefined) updateData.garageId = garageId;
        if (customerId !== undefined) updateData.customerId = customerId;
        if (registrationNumber !== undefined) updateData.registrationNumber = registrationNumber;
        if (brand !== undefined) updateData.brand = brand;
        if (model !== undefined) updateData.model = model;
        if (year !== undefined) updateData.year = year;
        if (fuelType !== undefined) updateData.fuelType = fuelType;
        if (engineNumber !== undefined) updateData.engineNumber = engineNumber;
        if (chassisNumber !== undefined) updateData.chassisNumber = chassisNumber;
        if (odometerReading !== undefined) updateData.odometerReading = odometerReading;
        if (color !== undefined) updateData.color = color;

        if (garageId !== undefined && currentUser.role !== "admin" && vehicle.garageId.toString() !== garageId.toString()) {
            const error = new Error("Forbidden!! You can only update vehicles for your own garage");
            error.statusCode = 403;
            throw error;
        }

        if (customerId !== undefined) {
            const customer = await customerModel.findById(customerId);
            if (!customer) {
                const error = new Error("Customer not found!!");
                error.statusCode = 404;
                throw error;
            }

            if (currentUser.role !== "admin" && customer.garageId.toString() !== currentUser.garageId.toString()) {
                const error = new Error("Forbidden!! Customer does not belong to your garage");
                error.statusCode = 403;
                throw error;
            }
        }

        if (registrationNumber !== undefined) {
            const existingVehicle = await vehicleModel.findOne({
                registrationNumber: registrationNumber.toUpperCase().trim(),
                _id: { $ne: vehicle._id },
            });

            if (existingVehicle) {
                const error = new Error("Vehicle already exists with this registration number!!");
                error.statusCode = 409;
                throw error;
            }
        }

        const updatedVehicle = await vehicleModel.findByIdAndUpdate(vehicle._id, updateData, {
            new: true,
            runValidators: true,
        });

        return res.status(200).json({
            message: "Vehicle updated successfully...",
            vehicle: serializeVehicle(updatedVehicle),
        });
    } catch (error) {
        console.error("Error updating vehicle:", error);
        next(error);
    }
};

export const deleteVehicle = async (req, res, next) => {
    try {
        const currentUser = await getCurrentUser(req.userID);

        if (!currentUser || !isAdmin(currentUser.role)) {
            const error = new Error("Forbidden!! Only admin can delete vehicle");
            error.statusCode = 403;
            throw error;
        }

        const vehicle = await vehicleModel.findByIdAndDelete(req.params.vehicleId);

        if (!vehicle) {
            const error = new Error("Vehicle not found!!");
            error.statusCode = 404;
            throw error;
        }

        return res.status(200).json({
            message: "Vehicle deleted successfully...",
        });
    } catch (error) {
        console.error("Error deleting vehicle:", error);
        next(error);
    }
};
