import customerModel from "../models/customer.model.js";
import userModel from "../models/user.model.js";

const serializeCustomer = (customer) => {
    const plainCustomer = customer.toObject ? customer.toObject() : customer;
    const { __v, ...safeCustomer } = plainCustomer;
    return safeCustomer;
};

const getCurrentUser = async (userID) => {
    return userModel.findById(userID).select("role garageId isActive");
};

const canManageCustomers = (role) => role === "admin" || role === "service_advisor";

const isAdmin = (role) => role === "admin";

export const createCustomer = async (req, res, next) => {
    try {
        const currentUser = await getCurrentUser(req.userID);

        if (!currentUser || !canManageCustomers(currentUser.role)) {
            const error = new Error("Forbidden!! You do not have access to create customer");
            error.statusCode = 403;
            throw error;
        }

        const { garageId, firstName, lastName, email, phone, address, notes } = req.body;

        if (currentUser.garageId?.toString() !== garageId?.toString() && !isAdmin(currentUser.role)) {
            const error = new Error("Forbidden!! You can only create customers for your own garage");
            error.statusCode = 403;
            throw error;
        }

        if (email) {
            const existingCustomer = await customerModel.findOne({
                garageId,
                email: email.toLowerCase().trim(),
            });

            if (existingCustomer) {
                const error = new Error("Customer already exists with this email in this garage!!");
                error.statusCode = 409;
                throw error;
            }
        }

        const customer = await customerModel.create({
            garageId,
            firstName,
            lastName,
            email,
            phone,
            address,
            notes,
        });

        return res.status(201).json({
            message: "Customer created successfully...",
            customer: serializeCustomer(customer),
        });
    } catch (error) {
        console.error("Error creating customer:", error);
        next(error);
    }
};

export const listCustomers = async (req, res, next) => {
    try {
        const currentUser = await getCurrentUser(req.userID);

        if (!currentUser || !canManageCustomers(currentUser.role)) {
            const error = new Error("Forbidden!! You do not have access to customer list");
            error.statusCode = 403;
            throw error;
        }

        const query = currentUser.role === "admin" && req.query.garageId
            ? { garageId: req.query.garageId }
            : { garageId: currentUser.garageId };

        const customers = await customerModel.find(query).sort({ createdAt: -1 });

        return res.status(200).json({
            message: "Customers fetched successfully...",
            customers: customers.map(serializeCustomer),
        });
    } catch (error) {
        console.error("Error listing customers:", error);
        next(error);
    }
};

export const getCustomerById = async (req, res, next) => {
    try {
        const currentUser = await getCurrentUser(req.userID);

        if (!currentUser || !canManageCustomers(currentUser.role)) {
            const error = new Error("Forbidden!! You do not have access to customer data");
            error.statusCode = 403;
            throw error;
        }

        const customer = await customerModel.findById(req.params.customerId);

        if (!customer) {
            const error = new Error("Customer not found!!");
            error.statusCode = 404;
            throw error;
        }

        if (currentUser.role !== "admin" && customer.garageId.toString() !== currentUser.garageId.toString()) {
            const error = new Error("Forbidden!! You can only view customers in your own garage");
            error.statusCode = 403;
            throw error;
        }

        return res.status(200).json({
            message: "Customer fetched successfully...",
            customer: serializeCustomer(customer),
        });
    } catch (error) {
        console.error("Error fetching customer:", error);
        next(error);
    }
};

export const updateCustomer = async (req, res, next) => {
    try {
        const currentUser = await getCurrentUser(req.userID);

        if (!currentUser || !canManageCustomers(currentUser.role)) {
            const error = new Error("Forbidden!! You do not have access to update customer");
            error.statusCode = 403;
            throw error;
        }

        const customer = await customerModel.findById(req.params.customerId);

        if (!customer) {
            const error = new Error("Customer not found!!");
            error.statusCode = 404;
            throw error;
        }

        if (currentUser.role !== "admin" && customer.garageId.toString() !== currentUser.garageId.toString()) {
            const error = new Error("Forbidden!! You can only update customers in your own garage");
            error.statusCode = 403;
            throw error;
        }

        const { firstName, lastName, email, phone, address, notes } = req.body;
        const updateData = {};

        if (firstName !== undefined) updateData.firstName = firstName;
        if (lastName !== undefined) updateData.lastName = lastName;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
        if (address !== undefined) updateData.address = address;
        if (notes !== undefined) updateData.notes = notes;

        if (email !== undefined) {
            const existingCustomer = await customerModel.findOne({
                garageId: customer.garageId,
                email: email.toLowerCase().trim(),
                _id: { $ne: customer._id },
            });

            if (existingCustomer) {
                const error = new Error("Customer already exists with this email in this garage!!");
                error.statusCode = 409;
                throw error;
            }
        }

        const updatedCustomer = await customerModel.findByIdAndUpdate(customer._id, updateData, {
            new: true,
            runValidators: true,
        });

        return res.status(200).json({
            message: "Customer updated successfully...",
            customer: serializeCustomer(updatedCustomer),
        });
    } catch (error) {
        console.error("Error updating customer:", error);
        next(error);
    }
};

export const deleteCustomer = async (req, res, next) => {
    try {
        const currentUser = await getCurrentUser(req.userID);

        if (!currentUser || !isAdmin(currentUser.role)) {
            const error = new Error("Forbidden!! Only admin can delete customer");
            error.statusCode = 403;
            throw error;
        }

        const customer = await customerModel.findByIdAndDelete(req.params.customerId);

        if (!customer) {
            const error = new Error("Customer not found!!");
            error.statusCode = 404;
            throw error;
        }

        return res.status(200).json({
            message: "Customer deleted successfully...",
        });
    } catch (error) {
        console.error("Error deleting customer:", error);
        next(error);
    }
};
