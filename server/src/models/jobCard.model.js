import mongoose from "mongoose";

const jobCardSchema = new mongoose.Schema(
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

    assignedMechanic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    complaints: [
      {
        type: String,
        trim: true,
      },
    ],

    inspectionNotes: {
      type: String,
      trim: true,
    },

    estimatedCost: {
      type: Number,
      default: 0,
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    status: {
      type: String,
      enum: [
        "pending",
        "in_progress",
        "waiting_for_parts",
        "completed",
        "cancelled",
      ],
      default: "pending",
    },

    expectedDeliveryDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const jobCardModel = mongoose.model("JobCard", jobCardSchema);

export default jobCardModel;