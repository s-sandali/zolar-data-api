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

    // Solar unit capacity for test data generation
    // NOTE: In production, real solar panels send raw measurement data without knowing
    // the system's configured capacity. For testing purposes, we use 5000W to match
    // the capacity value set in the backend seed script (zolar-back-end/src/infrastructure/seed.ts:20).
    // This ensures generated test data is realistic and proportional to the panel's capacity.
    const solarUnitCapacity = 5000; // Must match backend seed: backend/seed.ts:20

    // Clear existing data
    await EnergyGenerationRecord.deleteMany({});

    // Create historical energy generation records for the last 90 days (ending today)
    const records = [];
    const endDate = new Date(); // Today
    endDate.setHours(23, 59, 59, 999); // End of today

    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 90); // 90 days ago
    startDate.setHours(0, 0, 0, 0); // Start of that day

    // Anomaly injection periods (relative to today - spread across the 90 days)
    // Place anomalies at specific intervals for testing
    const nighttimeAnomalyStart = new Date(endDate);
    nighttimeAnomalyStart.setDate(nighttimeAnomalyStart.getDate() - 80); // 80 days ago
    const nighttimeAnomalyEnd = new Date(nighttimeAnomalyStart);
    nighttimeAnomalyEnd.setDate(nighttimeAnomalyEnd.getDate() + 2); // 2-day period

    const zeroGenerationAnomalyStart = new Date(endDate);
    zeroGenerationAnomalyStart.setDate(zeroGenerationAnomalyStart.getDate() - 70); // 70 days ago
    const zeroGenerationAnomalyEnd = new Date(zeroGenerationAnomalyStart);
    zeroGenerationAnomalyEnd.setDate(zeroGenerationAnomalyEnd.getDate() + 2);

    const thresholdCapacityAnomalyStart = new Date(endDate);
    thresholdCapacityAnomalyStart.setDate(thresholdCapacityAnomalyStart.getDate() - 55); // 55 days ago
    const thresholdCapacityAnomalyEnd = new Date(thresholdCapacityAnomalyStart);
    thresholdCapacityAnomalyEnd.setDate(thresholdCapacityAnomalyEnd.getDate() + 2);

    const weatherMismatchAnomalyStart = new Date(endDate);
    weatherMismatchAnomalyStart.setDate(weatherMismatchAnomalyStart.getDate() - 45); // 45 days ago
    const weatherMismatchAnomalyEnd = new Date(weatherMismatchAnomalyStart);
    weatherMismatchAnomalyEnd.setDate(weatherMismatchAnomalyEnd.getDate() + 2);

    const frozenGenerationAnomalyStart = new Date(endDate);
    frozenGenerationAnomalyStart.setDate(frozenGenerationAnomalyStart.getDate() - 35); // 35 days ago
    const frozenGenerationAnomalyEnd = new Date(frozenGenerationAnomalyStart);
    frozenGenerationAnomalyEnd.setDate(frozenGenerationAnomalyEnd.getDate() + 1);

    let currentDate = new Date(startDate);
    let recordCount = 0;
    let nighttimeAnomalyCount = 0;
    let zeroGenerationAnomalyCount = 0;
    let thresholdCapacityAnomalyCount = 0;
    let weatherMismatchAnomalyCount = 0;
    let frozenGenerationAnomalyCount = 0;
    let frozenValue: number | null = null;

    // Calculate maximum energy per interval (capacity × 2 hours)
    const intervalHours = 2;
    const maxEnergyPerInterval = solarUnitCapacity * intervalHours;
    console.log(`Maximum energy per ${intervalHours}h interval: ${maxEnergyPerInterval}Wh\n`);

    while (currentDate <= endDate) {
      // Generate realistic energy values based on time of day and season
      const hour = currentDate.getUTCHours();
      const month = currentDate.getUTCMonth(); // 0-11

      // Base energy generation as percentage of max capacity (varies by season)
      // Using percentages ensures values scale with actual capacity
      let baseEnergyPercent = 0.04; // 4% of max capacity for off-season
      if (month >= 5 && month <= 7) {
        // June-August (summer) - best conditions
        baseEnergyPercent = 0.06; // 6% of max
      } else if (month >= 2 && month <= 4) {
        // March-May (spring) - good conditions
        baseEnergyPercent = 0.05; // 5% of max
      } else if (month >= 8 && month <= 10) {
        // September-November (fall) - moderate conditions
        baseEnergyPercent = 0.04; // 4% of max
      } else {
        // December-February (winter) - poor conditions
        baseEnergyPercent = 0.03; // 3% of max
      }

      let baseEnergy = maxEnergyPerInterval * baseEnergyPercent;

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

      // WEATHER SIMULATION: Generate realistic weather conditions
      // Most days are clear/partly cloudy during daytime
      let weatherCondition: "clear" | "partly_cloudy" | "overcast" | "rain" = "clear";
      let cloudCover = 0;

      if (hour >= 6 && hour <= 18) {
        // Daytime hours - assign weather randomly (80% clear/partly cloudy, 20% overcast/rain)
        const weatherRandom = Math.random();
        if (weatherRandom < 0.5) {
          weatherCondition = "clear";
          cloudCover = Math.round(Math.random() * 20); // 0-20%
        } else if (weatherRandom < 0.8) {
          weatherCondition = "partly_cloudy";
          cloudCover = Math.round(20 + Math.random() * 30); // 20-50%
        } else if (weatherRandom < 0.95) {
          weatherCondition = "overcast";
          cloudCover = Math.round(80 + Math.random() * 20); // 80-100%
          // Reduce energy for overcast days
          energyGenerated = Math.round(energyGenerated * 0.5);
        } else {
          weatherCondition = "rain";
          cloudCover = 100;
          // Reduce energy significantly for rainy days
          energyGenerated = Math.round(energyGenerated * 0.3);
        }
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

      // ANOMALY INJECTION: Energy Exceeding Threshold Capacity (Sep 5-7, 2025)
      // Simulate data corruption/miscalculation causing readings to exceed physical limits
      // Inject at peak hours (12:00, 14:00) to limit count (2 per day × 3 days = 6 total)
      // Physical limit: capacity × intervalHours (e.g., 5000W × 2h = 10,000 Wh max)
      // Inject values > maxEnergyPerInterval (physically impossible)
      if (currentDate >= thresholdCapacityAnomalyStart && currentDate <= thresholdCapacityAnomalyEnd) {
        if (hour === 12 || hour === 14) {
          // Generate values exceeding physical capacity (105-120% of max)
          const excessMin = maxEnergyPerInterval * 1.05;
          const excessMax = maxEnergyPerInterval * 1.20;
          energyGenerated = Math.round(excessMin + Math.random() * (excessMax - excessMin));
          injectedAnomaly = "ENERGY_EXCEEDING_THRESHOLD";
          thresholdCapacityAnomalyCount++;
        }
      }

      // ANOMALY INJECTION: Weather-Performance Mismatch (Sep 15-17, 2025)
      // Type 1: High generation during bad weather (rain/overcast but high output)
      // Type 2: Low generation during clear weather (clear sky but low output)
      // Inject at peak hours: 12:00 (high gen bad weather), 14:00 (low gen clear weather)
      // 2 per day × 3 days = 6 total
      if (currentDate >= weatherMismatchAnomalyStart && currentDate <= weatherMismatchAnomalyEnd) {
        if (hour === 12) {
          // High generation during rain (should be ~30% but generating 80%+)
          weatherCondition = "rain";
          cloudCover = 100;
          energyGenerated = Math.round(baseEnergy * 1.2 * 0.8); // 80% of peak capacity during rain
          injectedAnomaly = "HIGH_GENERATION_BAD_WEATHER";
          weatherMismatchAnomalyCount++;
        } else if (hour === 14) {
          // Low generation during clear sky (should be high but only 20%)
          weatherCondition = "clear";
          cloudCover = 5;
          energyGenerated = Math.round(baseEnergy * 1.2 * 0.2); // Only 20% during perfect conditions
          injectedAnomaly = "LOW_GENERATION_CLEAR_WEATHER";
          weatherMismatchAnomalyCount++;
        }
      }

      // ANOMALY INJECTION: Frozen Generation Values (Sep 25-26, 2025)
      // Simulate sensor freeze/stale data by repeating the same energy value for 12 consecutive intervals
      // This creates a 24-hour period where the value doesn't change despite weather variations
      // The frozen value will persist across weather changes, making it more obvious
      if (currentDate >= frozenGenerationAnomalyStart && currentDate <= frozenGenerationAnomalyEnd) {
        // Set frozen value at the start of the anomaly period
        if (frozenValue === null) {
          frozenValue = Math.round(baseEnergy * 1.2); // Lock at a moderate value (~300-400 Wh)
        }
        // Force all records in this period to have the same energy value
        energyGenerated = frozenValue;
        injectedAnomaly = "FROZEN_GENERATION";
        frozenGenerationAnomalyCount++;
      } else {
        // Reset frozen value when outside the anomaly period
        frozenValue = null;
      }

      records.push({
        serialNumber: serialNumber,
        timestamp: new Date(currentDate),
        energyGenerated: energyGenerated,
        weatherCondition: weatherCondition,
        cloudCover: cloudCover,
        injectedAnomaly: injectedAnomaly,
      });

      // Move to next 2-hour interval
      currentDate = new Date(currentDate.getTime() + 2 * 60 * 60 * 1000);
      recordCount++;
    }
    await EnergyGenerationRecord.insertMany(records);

    console.log(
      `Database seeded successfully. Generated ${recordCount} energy generation records from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}.`
    );
    console.log(`Injected ${nighttimeAnomalyCount} NIGHTTIME_GENERATION anomalies (~80 days ago).`);
    console.log(`Injected ${zeroGenerationAnomalyCount} ZERO_GENERATION_CLEAR_SKY anomalies (~70 days ago).`);
    console.log(`Injected ${thresholdCapacityAnomalyCount} ENERGY_EXCEEDING_THRESHOLD anomalies (~55 days ago).`);
    console.log(`Injected ${weatherMismatchAnomalyCount} WEATHER_MISMATCH anomalies (~45 days ago).`);
    console.log(`Injected ${frozenGenerationAnomalyCount} FROZEN_GENERATION anomalies (~35 days ago).`);
  } catch (err) {
    console.error("Seeding error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
