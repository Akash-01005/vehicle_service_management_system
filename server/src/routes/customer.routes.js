import { Router } from "express";
import authMiddleware from "../middlewares/auth.js";
import validateCustomer from "../middlewares/validateCustomer.js";
import {
    createCustomer,
    listCustomers,
    getCustomerById,
    updateCustomer,
    deleteCustomer,
} from "../controllers/customer.controllers.js";

const customerRouter = Router();

customerRouter.post("/", authMiddleware, validateCustomer, createCustomer);
customerRouter.get("/", authMiddleware, listCustomers);
customerRouter.get("/:customerId", authMiddleware, getCustomerById);
customerRouter.patch("/:customerId", authMiddleware, updateCustomer);
customerRouter.delete("/:customerId", authMiddleware, deleteCustomer);

export default customerRouter;
