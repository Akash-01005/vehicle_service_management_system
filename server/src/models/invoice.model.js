import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    garageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Garage",
      required: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },

    jobCardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobCard",
      required: true,
    },

    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    labourCharge: {
      type: Number,
      default: 0,
    },

    partsCharge: {
      type: Number,
      default: 0,
    },

    taxAmount: {
      type: Number,
      default: 0,
    },

    discountAmount: {
      type: Number,
      default: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "partially_paid"],
      default: "pending",
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "card", "upi", "bank_transfer"],
    },

    pdfKey: {
      type: String,
      default: null,
    },

    pdfUrl: {
      type: String,
      default: null,
    },

    pdfUploadedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Invoice = mongoose.model("Invoice", invoiceSchema);

export default Invoice;