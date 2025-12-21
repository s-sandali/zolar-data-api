import mongoose from "mongoose";
import { EnergyGenerationRecord } from "./entities/EnergyGenerationRecord";
import dotenv from "dotenv";
import { connectDB } from "./db";

dotenv.config();

async function seed() {

  const serialNumber = "SU-0001";

  try {
    // Connect to DB
    await connectDB();

    // Clear existing data
    await EnergyGenerationRecord.deleteMany({});

    // Create historical energy generation records from Aug 1, 2025 8pm to Oct 12, 2025 8am every 2 hours
    const records = [];
    const startDate = new Date("2025-08-01T08:00:00Z"); // August 1, 2025 8pm UTC
    const endDate = new Date("2025-11-23T08:00:00Z"); // November 23, 2025 8am UTC

    // Anomaly injection periods
    const nighttimeAnomalyStart = new Date("2025-08-10T00:00:00Z");
    const nighttimeAnomalyEnd = new Date("2025-08-12T23:59:59Z");
    const zeroGenerationAnomalyStart = new Date("2025-08-20T00:00:00Z");
    const zeroGenerationAnomalyEnd = new Date("2025-08-22T23:59:59Z");
    const overproductionAnomalyStart = new Date("2025-09-05T00:00:00Z");
    const overproductionAnomalyEnd = new Date("2025-09-07T23:59:59Z");

    let currentDate = new Date(startDate);
    let recordCount = 0;
    let nighttimeAnomalyCount = 0;
    let zeroGenerationAnomalyCount = 0;
    let overproductionAnomalyCount = 0;

    while (currentDate <= endDate) {
      // Generate realistic energy values based on time of day and season
      const hour = currentDate.getUTCHours();
      const month = currentDate.getUTCMonth(); // 0-11

      // Base energy generation (higher in summer months)
      let baseEnergy = 200;
      if (month >= 5 && month <= 7) {
        // June-August (summer)
        baseEnergy = 300;
      } else if (month >= 2 && month <= 4) {
        // March-May (spring)
        baseEnergy = 250;
      } else if (month >= 8 && month <= 10) {
        // September-November (fall)
        baseEnergy = 200;
      } else {
        // December-February (winter)
        baseEnergy = 150;
      }

      // Adjust based on time of day (solar panels generate more during daylight)
      let timeMultiplier = 1;
      if (hour >= 6 && hour <= 18) {
        // Daylight hours
        timeMultiplier = 1.2;
        if (hour >= 10 && hour <= 14) {
          // Peak sun hours
          timeMultiplier = 1.5;
        }
      } else {
        // Night hours
        timeMultiplier = 0; // Minimal generation at night
      }

      // Add some random variation (±20%)
      const variation = 0.8 + Math.random() * 0.4;
      let energyGenerated = Math.round(
        baseEnergy * timeMultiplier * variation
      );

      // Ensure night hours have exactly 0 unless it's an anomaly
      if (timeMultiplier === 0) {
        energyGenerated = 0;
      }

      // ANOMALY INJECTION: Nighttime Generation (Aug 10-12, 2025)
      // Simulate sensor malfunction causing nighttime readings
      // Only inject at specific hours to limit count: 20:00, 22:00, 02:00 (3 per day × 3 days = 9 total)
      let injectedAnomaly = null;
      if (currentDate >= nighttimeAnomalyStart && currentDate <= nighttimeAnomalyEnd) {
        if (hour === 20 || hour === 22 || hour === 2) {
          // During specific night hours, inject abnormal generation
          energyGenerated = Math.round(30 + Math.random() * 50); // 30-80 Wh at night
          injectedAnomaly = "NIGHTTIME_GENERATION";
          nighttimeAnomalyCount++;
        }
      }

      // ANOMALY INJECTION: Zero Generation on Clear Sky Days (Aug 20-22, 2025)
      // Simulate panel disconnection or complete system failure during peak hours
      // Only inject at noon (12:00) to limit count (1 per day × 3 days = 3 total)
      if (currentDate >= zeroGenerationAnomalyStart && currentDate <= zeroGenerationAnomalyEnd) {
        if (hour === 12) {
          // Force zero generation during peak noon hour (indicates system failure)
          energyGenerated = 0;
          injectedAnomaly = "ZERO_GENERATION_CLEAR_SKY";
          zeroGenerationAnomalyCount++;
        }
      }

      // ANOMALY INJECTION: Overproduction (Sep 5-7, 2025)
      // Simulate sensor malfunction/calibration error causing readings >120% of rated capacity
      // Inject at peak hours (12:00, 14:00) to limit count (2 per day × 3 days = 6 total)
      // Rated capacity: 500W × 2 hours = 1000 Wh max, so >1200 Wh is abnormal
      if (currentDate >= overproductionAnomalyStart && currentDate <= overproductionAnomalyEnd) {
        if (hour === 12 || hour === 14) {
          // Generate extremely high values (1300-1500 Wh, which is 130-150% of max capacity)
          energyGenerated = Math.round(1300 + Math.random() * 200);
          injectedAnomaly = "OVERPRODUCTION";
          overproductionAnomalyCount++;
        }
      }

      records.push({
        serialNumber: serialNumber,
        timestamp: new Date(currentDate),
        energyGenerated: energyGenerated,
        injectedAnomaly: injectedAnomaly,
      });

      // Move to next 2-hour interval
      currentDate = new Date(currentDate.getTime() + 2 * 60 * 60 * 1000);
      recordCount++;
    }
    await EnergyGenerationRecord.insertMany(records);

    console.log(
      `Database seeded successfully. Generated ${recordCount} energy generation records from ${startDate.toUTCString()} to ${endDate.toUTCString()}.`
    );
    console.log(`Injected ${nighttimeAnomalyCount} NIGHTTIME_GENERATION anomalies (Aug 10-12, 2025).`);
    console.log(`Injected ${zeroGenerationAnomalyCount} ZERO_GENERATION_CLEAR_SKY anomalies (Aug 20-22, 2025).`);
    console.log(`Injected ${overproductionAnomalyCount} OVERPRODUCTION anomalies (Sep 5-7, 2025).`);
  } catch (err) {
    console.error("Seeding error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
