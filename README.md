# Enterprise Agency Management System (AMS) Prototype & Legacy Crosswalk Integration Engine

A functional, lightweight Agency Management System (AMS) prototype built with **Node.js, Express, and TypeScript**, containerized with **Docker** and **docker-compose**. The system mimics core domain models and REST API patterns common in enterprise agency management platforms and includes an intelligent **Legacy Ingestion & Crosswalk Module** for migrating raw export payloads (Format A, Format B, and Format C).

---

## 🏗 Architecture & Design System

```
                                +-------------------------------------------+
                                |            Core AMS REST API Layer        |
                                | GET  /api/v1/customers                    |
                                | POST /api/v1/customers                    |
                                | GET  /api/v1/policies                     |
                                | POST /api/v1/policies                     |
                                | GET  /api/v1/policies/:id/dec-page        |
                                | POST /api/v1/integration/import           |
                                +---------------------+---------------------+
                                                      |
                                                      v
                                +-------------------------------------------+
                                |        Legacy Crosswalk Engine            |
                                |  +-------------------+-----------------+  |
                                |  | Format A Transform|Format BTransf.  |  |
                                |  +-------------------+-----------------+  |
                                |  | Format C Transformer                |  |
                                |  +-------------------------------------+  |
                                +---------------------+---------------------+
                                                      |
                                                      v
                                +-------------------------------------------+
                                |        Canonical Domain Repository        |
                                | Customer | Policy | Carrier | DecPage     |
                                +-------------------------------------------+
```

---

## 📁 Repository Directory Layout

```
ams-proto/
├── Dockerfile                  # Multi-stage build (Dev with tsx live-reload & Prod runtime)
├── docker-compose.yml          # Container orchestration listening on port 6000
├── package.json                # Dependencies, build scripts & test commands
├── tsconfig.json               # TypeScript ES2022 / NodeNext compiler options
├── README.md                   # Complete architectural guide & curl test suite
├── .commercial_crosswalk_reference.notes # Gitignored internal reference mapping file
├── sample_payloads/            # Raw legacy export JSON templates
│   ├── format_a_payload.json   # Legacy Format A raw export payload
│   ├── format_b_payload.json   # Legacy Format B raw export payload
│   └── format_c_payload.json   # Legacy Format C raw export payload
└── src/
    ├── app.ts                  # Express application setup & middleware registration
    ├── server.ts               # Server startup listener
    ├── controllers/            # HTTP Controller handlers
    │   ├── customer.controller.ts
    │   ├── policy.controller.ts
    │   └── integration.controller.ts
    ├── data/                   # Pre-seeded InsurTech database (Carriers, Insureds, Policies)
    │   └── seedData.ts
    ├── middleware/             # Centralized error handling and security
    │   └── errorHandler.ts
    ├── routes/                 # Express REST endpoint routing
    │   ├── customer.routes.ts
    │   ├── policy.routes.ts
    │   ├── integration.routes.ts
    │   └── index.ts
    ├── scripts/                # Standalone migration test runner
    │   └── testImport.ts
    ├── services/               # Core AMS business logic & ACORD dec-page generator
    │   └── ams.service.ts
    ├── transformers/           # Crosswalk Transformation Module
    │   ├── base.transformer.ts
    │   ├── formatA.transformer.ts
    │   ├── formatB.transformer.ts
    │   ├── formatC.transformer.ts
    │   └── crosswalk.engine.ts
    └── types/                  # Canonical Domain & Legacy Interface definitions
        ├── domain.ts
        └── legacy.ts
```

---

## 💎 Core Domain & Data Primitives

1. **Customer / Insured** (`src/types/domain.ts`):
   - Supports Commercial & Individual entity types.
   - Tracks FEIN/SSN, full address hierarchy, contact methods, status, and `legacyCrosswalks` lineage tracking.
2. **Policy** (`src/types/domain.ts`):
   - Lines of Business (LOB): `Commercial Auto`, `General Liability`, `Commercial Property`, `Workers Comp`, `BOP`, `Personal Auto`, `Homeowners`.
   - Effective & Expiration dates, status (`Active`, `Expired`, `Cancelled`, `Pending`), premium amounts, billing type (`Agency Bill` vs `Direct Bill`), and itemized coverage schedules.
3. **Carrier** (`src/types/domain.ts`):
   - NAIC Number, Writing Company name, AM Best Rating, claims contacts.
4. **ACORD Declaration Page (Dec-Page)** (`AcordDecPagePayload`):
   - Standardized payload mirroring ACORD 125/126 commercial declaration standards, containing producer info, insured tax identifiers, coverage summaries, premium breakdowns, and endorsement form numbers (`IL 00 17`, `CG 00 01`).

---

## ⚡ Legacy Ingestion & Crosswalk Module

The crosswalk engine normalizes disparate legacy data formats into canonical AMS entities:

| Legacy System Format | Legacy Primary Key | Target AMS Customer ID | LOB Mapping Example | Date Format Normalization |
| :--- | :--- | :--- | :--- | :--- |
| **Format A** | `Client_PK` / `ClientCode` | `CUST-FMT-A-{Client_PK}` | `AUTOC` -> `Commercial Auto` | `MM/DD/YYYY` -> `YYYY-MM-DD` |
| **Format B** | `CUST_ID` / `CLIENT_NO` | `CUST-FMT-B-{CUST_ID}` | `WORKCOMP` -> `Workers Comp` | `YYYYMMDD` -> `YYYY-MM-DD` |
| **Format C** | `ClientNum` / `FileID` | `CUST-FMT-C-{ClientNum}` | `Personal Auto` -> `Personal Auto` | `YYYY-MM-DD` -> `YYYY-MM-DD` |

The engine generates detailed **Mapping Logs** (`INFO`/`WARN`) and highlights **Mapping Exceptions** (e.g. missing FEIN/SSN or unmapped carrier NAICs) without breaking processing.

---

## 🐳 Docker Deployment & Execution Guide

### Prerequisites
- Docker Engine & Docker Compose installed.

### Step 1: Build & Launch Container
```bash
docker compose up --build -d
```

### Step 2: Check Container Health & Logs
```bash
docker compose logs -f ams-api
```
Verify the server is running on `http://localhost:6000`.

---

## 🧪 Comprehensive API Test Suite (curl Commands)

### 1. Health Check
```bash
curl -s http://localhost:6000/health
```

### 2. Search Customers (by Name or Policy Number)
- **Filter by Name:**
```bash
curl -s "http://localhost:6000/api/v1/customers?name=Apex"
```

- **Filter by Policy Number:**
```bash
curl -s "http://localhost:6000/api/v1/customers?policyNumber=POL-CA-2026-001"
```

### 3. Create a New Customer
```bash
curl -s -X POST http://localhost:6000/api/v1/customers \
  -H "Content-Type: application/json" \
  -d '{
    "entityType": "Commercial",
    "businessName": "Titan Hauling & Logistics Inc",
    "dba": "Titan Freight",
    "feinOrSsn": "88-1092834",
    "address": {
      "street1": "900 Logistics Blvd",
      "city": "Des Plaines",
      "state": "IL",
      "postalCode": "60016",
      "country": "USA"
    },
    "contactInfo": {
      "email": "safety@titanhauling.com",
      "phone": "847-555-9000"
    }
  }'
```

### 4. Query Policies (with Carrier, Status & Effective Date filters)
- **Filter by Status:**
```bash
curl -s "http://localhost:6000/api/v1/policies?status=Active"
```

- **Filter by Carrier ID:**
```bash
curl -s "http://localhost:6000/api/v1/policies?carrierId=CARRIER-001"
```

### 5. Generate ACORD-Style Declaration Page (Dec-Page)
```bash
curl -s "http://localhost:6000/api/v1/policies/POL-CA-2026-001/dec-page"
```

---

## 🔄 Legacy Migration Import Endpoints

Test migration ingestion against the running API using sample payload templates:

### 1. Migrate Format A Payload
```bash
curl -s -X POST http://localhost:6000/api/v1/integration/import \
  -H "Content-Type: application/json" \
  -d @sample_payloads/format_a_payload.json
```

### 2. Migrate Format B Payload
```bash
curl -s -X POST http://localhost:6000/api/v1/integration/import \
  -H "Content-Type: application/json" \
  -d @sample_payloads/format_b_payload.json
```

### 3. Migrate Format C Payload
```bash
curl -s -X POST http://localhost:6000/api/v1/integration/import \
  -H "Content-Type: application/json" \
  -d @sample_payloads/format_c_payload.json
```

---

## 🛠 Local CLI Testing (Without Docker)

You can also run the migration test suite locally using Node.js:

```bash
cmd /c npm run build
cmd /c npm run test:import
```
