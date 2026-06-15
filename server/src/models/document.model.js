import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    garageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Garage",
      required: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },

    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      default: null,
    },

    jobCardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobCard",
      default: null,
    },

    serviceRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceRecord",
      default: null,
    },

    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      default: null,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    documentType: {
      type: String,
      enum: ["registration", "insurance", "license", "estimate", "invoice", "job_card", "service_record", "other"],
      default: "other",
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    originalName: {
      type: String,
      required: true,
      trim: true,
    },

    mimeType: {
      type: String,
      required: true,
      trim: true,
    },

    size: {
      type: Number,
      required: true,
    },

    s3Key: {
      type: String,
      required: true,
    },

    s3Url: {
      type: String,
      required: true,
    },

    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const documentModel = mongoose.model("Document", documentSchema);

export default documentModel;
