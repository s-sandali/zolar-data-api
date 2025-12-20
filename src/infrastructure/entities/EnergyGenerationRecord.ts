import mongoose from "mongoose";

const energyGenerationRecordSchema = new mongoose.Schema({
  serialNumber: {
    type: String,
    required: true,
  },
  energyGenerated: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  intervalHours: {
    type: Number,
    default: 2,
    min: 0.1,
    max: 24,
  },
  // For testing/debugging anomaly detection
  injectedAnomaly: {
    type: String,
    enum: [
      "NIGHTTIME_GENERATION",
      "ZERO_GENERATION_CLEAR_SKY",
      "OVERPRODUCTION",
      "HIGH_GENERATION_BAD_WEATHER",
      "LOW_GENERATION_CLEAR_WEATHER",
      "SUDDEN_PRODUCTION_DROP",
      "ERRATIC_OUTPUT",
    ],
    required: false,
  },
});

export const EnergyGenerationRecord = mongoose.model(
  "EnergyGenerationRecord",
  energyGenerationRecordSchema
);
