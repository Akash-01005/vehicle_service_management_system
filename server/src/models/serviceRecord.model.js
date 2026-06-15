import mongoose from "mongoose";

const serviceRecordSchema = new mongoose.Schema(
  {
    garageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Garage",
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

    serviceDate: {
      type: Date,
      default: Date.now,
    },

    odometerReading: {
      type: Number,
      required: true,
    },

    servicesPerformed: [
      {
        type: String,
        trim: true,
      },
    ],

    remarks: {
      type: String,
      trim: true,
    },

    nextServiceDate: {
      type: Date,
    },

    nextServiceKm: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

const serviceRecordModel = mongoose.model("ServiceRecord",serviceRecordSchema);

export default serviceRecordModel;