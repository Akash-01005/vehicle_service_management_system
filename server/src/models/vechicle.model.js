import mongoose from "mongoose";

const vehicleSchema = new mongoose.Schema(
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

    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    brand: {
      type: String,
      required: true,
      trim: true,
    },

    model: {
      type: String,
      required: true,
      trim: true,
    },

    year: {
      type: Number,
    },

    fuelType: {
      type: String,
      enum: ["Petrol", "Diesel", "Electric", "Hybrid", "CNG"],
      required: true,
    },

    engineNumber: {
      type: String,
      trim: true,
    },

    chassisNumber: {
      type: String,
      trim: true,
    },

    odometerReading: {
      type: Number,
      default: 0,
    },

    color: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const vehicleModel = mongoose.model("Vehicle", vehicleSchema);

export default vehicleModel;