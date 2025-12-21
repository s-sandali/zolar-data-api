# Zolar Data API

> **Solar Energy Monitoring System - IoT Data Simulation Service**

A specialized microservice that simulates solar panel IoT sensors, generating realistic energy production data with weather conditions and intentional anomalies for testing.

**🌐 Live API**: [https://fed-4-data-api-sandali.onrender.com](https://fed-4-data-api-sandali.onrender.com)

---

## 📑 Table of Contents

- [Project Overview](#project-overview)
- [System Architecture](#system-architecture)
- [Key Functionalities](#key-functionalities)
- [Setup Instructions](#setup-instructions)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Deployed Links](#deployed-links)

---

## 🎯 Project Overview

The Zolar Data API is a lightweight microservice that simulates IoT sensor data from solar panel installations. It generates realistic energy production records with seasonal/time-of-day variations, weather impacts, and intentionally injected anomalies for testing detection algorithms. This service acts as the **data source layer** in the Zolar architecture, mimicking real-world IoT sensors.

**Tech Stack**: Express.js 5 • TypeScript • MongoDB • Mongoose • node-cron • Zod

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│           Data API (IoT Simulation Service)                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ API Layer                                            │  │
│  │  • GET /api/energy-generation-records/:serialNumber  │  │
│  │  • Incremental sync support (sinceTimestamp)        │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Application Layer                                    │  │
│  │  • Data retrieval logic                              │  │
│  │  • Timestamp filtering                               │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Infrastructure Layer                                 │  │
│  │  • MongoDB (separate database)                       │  │
│  │  • Seed script (1,500+ records with anomalies)      │  │
│  │  • Cron job (continuous data generation)            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP Polling (daily sync)
                          ↓
            ┌──────────────────────────────┐
            │  Backend API (Main Service)  │
            │  • Fetches new data daily    │
            │  • Runs anomaly detection    │
            └──────────────────────────────┘
```

**Microservice Role**: Simulates physical IoT sensors in solar installations

**Data Flow**:
1. Cron generates energy records every 2 hours
2. Backend polls Data API daily at midnight
3. Data API returns only new records (incremental sync)
4. Backend aggregates data for analytics

---

## ⚡ Key Functionalities

### Core Features
- 📡 **IoT Data Simulation**: Realistic solar panel energy generation patterns
- 🌤️ **Weather Modeling**: Simulated weather conditions (clear, partly cloudy, overcast, rain)
- 📊 **Time-Series Data**: 2-hour interval energy measurements
- 🔄 **Continuous Generation**: Automated cron jobs for ongoing data creation

### Realistic Energy Generation Algorithm

**Seasonal Variations** (% of 5000W capacity):
- Summer (Jun-Aug): 6% = ~300W base
- Spring (Mar-May): 5% = ~250W base
- Fall (Sep-Nov): 4% = ~200W base
- Winter (Dec-Feb): 3% = ~150W base

**Time-of-Day Multipliers**:
- Night (18:00-06:00): 0× (no generation)
- Daylight (06:00-18:00): 1.2×
- Peak hours (10:00-14:00): 1.5×

**Random Variation**: ±20% on all values

### Testing Features - Intentional Anomalies

Seed script injects 48 anomalies for detection testing:

| Anomaly Type | Count | Period | Description |
|--------------|-------|--------|-------------|
| **Nighttime Generation** | 9 | Aug 10-12 | Energy during night hours (sensor malfunction) |
| **Zero Generation Clear Sky** | 3 | Aug 20-22 | No output at noon (system failure) |
| **Energy Exceeding Capacity** | 6 | Sep 5-7 | Output > 100% capacity (data corruption) |
| **Weather Mismatch** | 6 | Sep 15-17 | High in rain OR low in clear sky |
| **Frozen Generation** | 24 | Sep 25-26 | Identical values for 48 hours (stuck sensors) |

### API Endpoint

**GET** `/api/energy-generation-records/solar-unit/:serialNumber`

Query Parameters:
- `sinceTimestamp` (optional): ISO 8601 timestamp for incremental sync

Response: Array of energy records with weather data

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- MongoDB Atlas account ([https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas))

### Installation Steps

1. **Navigate to project directory**:
```bash
cd zolar-data-api
```

2. **Install dependencies**:
```bash
npm install
```

3. **Create `.env` file** (see [Environment Variables](#environment-variables) section below)

4. **Seed the database** (generate 1,500+ records with anomalies):
```bash
npm run seed
```

This generates:
- Time range: August 1 - November 23, 2025
- Interval: 2 hours (12 records/day)
- Total: ~1,500 energy records
- Anomalies: 48 intentional anomalies across 5 types
- Serial number: `SU-0001` (matches backend)

5. **Start development server**:
```bash
npm run dev
```

6. **Access the API**:
```
http://localhost:8001
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run production build |
| `npm run seed` | Generate test data with anomalies |

### Testing the API

**Get all records**:
```bash
curl http://localhost:8001/api/energy-generation-records/solar-unit/SU-0001
```

**Get only new records** (incremental sync):
```bash
curl "http://localhost:8001/api/energy-generation-records/solar-unit/SU-0001?sinceTimestamp=2025-11-01T00:00:00.000Z"
```

---

## 🔧 Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database (use separate database from main backend)
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/data-api

# Server
PORT=8001

# Cron Configuration (optional)
ENERGY_CRON_SCHEDULE=0 */2 * * *
SOLAR_UNIT_SERIAL=SU-0001
```

### How to Get MongoDB Connection String

**MongoDB Atlas** ([https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)):
1. Create a free cluster (can use same cluster as backend, different database)
2. Go to "Database Access" → Create database user
3. Go to "Network Access" → Add IP address (0.0.0.0/0)
4. Click "Connect" → "Connect your application"
5. Copy connection string and replace `<password>` and database name with `data-api`

**Note**: Use a **separate database** (`data-api`) from the main backend database (`zolar`)

---

## 🚀 Deployment

### Deploy to Render

1. **Create Web Service**:
   - Connect GitHub repository
   - Select "Node" environment

2. **Build Settings**:
   - Build command: `npm run build`
   - Start command: `npm start`

3. **Environment Variables**: Add all variables from your `.env` file in Render Dashboard → Environment

4. **Deploy**: Click "Create Web Service"

### Post-Deployment Steps

1. **Seed the database**:
```bash
# SSH into Render instance or use one-off command
npm run seed
```

2. **Update backend configuration**:
   - Update backend's data-api URL from `http://localhost:8001` to deployed URL
   - Update in `zolar-back-end/src/application/background/sync-energy-generation-records.ts`

### Production Checklist
- ✅ Use production MongoDB cluster
- ✅ Ensure separate `data-api` database
- ✅ Run seed script after deployment
- ✅ Update backend to point to deployed Data API URL
- ✅ Verify cron job is running (check logs)

---

## 🌐 Deployed Links

| Service | URL | Status |
|---------|-----|--------|
| **Frontend** | [https://fed-4-front-end-sandali.netlify.app](https://fed-4-front-end-sandali.netlify.app) | ✅ Live |
| **Backend API** | [https://fed-4-back-end-sandali.onrender.com](https://fed-4-back-end-sandali.onrender.com) | ✅ Live |
| **Data API** | [https://fed-4-data-api-sandali.onrender.com](https://fed-4-data-api-sandali.onrender.com) | ✅ Live |

---

## 📞 Support

**Developer**: Sandali Sandagomi
**Email**: sandalisandagomi@gmail.com
**Course**: Fullstack Development Bootcamp - Day 17

---

**Built with ❤️ using TypeScript, Express, MongoDB, and node-cron**
