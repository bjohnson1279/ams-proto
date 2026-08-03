# Enterprise Agency Management System (AMS) Prototype & Legacy Crosswalk Integration Engine

A functional, lightweight Agency Management System (AMS) prototype built with **Node.js, Express, and TypeScript**, containerized with **Docker** and **docker-compose**. The system mimics core domain models and REST API patterns common in enterprise agency management platforms and includes an intelligent **Legacy Ingestion & Crosswalk Module** with a **Smart Deduplication Engine** and **Dry-Run Analysis Mode** for migrating raw export payloads from acquired agency systems (`Format A`, `Format B`, `Format C`, and `Format D`).

---

## 🔒 Privacy & Brand Anonymization Compliance

> [!IMPORTANT]
> **Strict Proprietary Brand Anonymization**
> To comply with public GitHub repository safety and non-disclosure standards, **no real-world proprietary AMS or software vendor names** (e.g., AMS360, Applied Epic, TAM, HawkSoft, EZLynx, Vertafore, Applied Systems) appear in git-tracked code, comments, test scripts, documentation, commit history, or UI text.
> 
> Systems are modeled using industry-standard abstract codenames:
> - **Core AMS (Target Destination System)**: `CoreAMS` / `ApexCore` (Enterprise Agency Management Platform)
> - **Source System Format A**: `Format A` (Enterprise Relational SQL / SOAP Export Schema)
> - **Source System Format B**: `Format B` (Classic DB Flat-File / Table Export Schema)
> - **Source System Format C**: `Format C` (Desktop CMS XML / Local DB Export Schema)
> - **Source System Format D**: `Format D` (Cloud Native JSON Stream / REST API Export Schema)
> 
> *Internal mapping reference is preserved in `.commercial_crosswalk_reference.notes` (listed in `.gitignore`).*

---

## 🏗 Architecture & Design System

```
                                +-------------------------------------------+
                                |      CoreAMS Web GUI & REST API Layer     |
                                | GET  /  (Interactive Workbench Dashboard) |
                                | GET  /api/v1/customers                    |
                                | POST /api/v1/customers                    |
                                | GET  /api/v1/policies                     |
                                | GET  /api/v1/policies/:id/dec-page        |
                                | POST /api/v1/integration/dry-run          |
                                | POST /api/v1/integration/import           |
                                | GET  /api/v1/integration/crosswalk-matrix |
                                +---------------------+---------------------+
                                                      |
                                                      v
                                +-------------------------------------------+
                                |        Legacy Crosswalk ETL Engine        |
                                |  +-------------------+-----------------+  |
                                |  | Format A Transform| Format B Trans. |  |
                                |  +-------------------+-----------------+  |
                                |  | Format C Transform| Format D Trans. |  |
                                |  +-------------------+-----------------+  |
                                |  | Smart Deduplication Engine (FEIN/Name) |  |
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
├── README.md                   # Complete architectural guide & test suite
├── .commercial_crosswalk_reference.notes # Gitignored internal reference mapping file
├── public/                     # Modern InsurTech Web Dashboard & Workbench GUI
│   └── index.html
├── sample_payloads/            # Raw legacy export JSON templates
│   ├── format_a_payload.json   # Format A raw export payload (SQL)
│   ├── format_b_payload.json   # Format B raw export payload (Flat)
│   ├── format_c_payload.json   # Format C raw export payload (Desktop)
│   └── format_d_payload.json   # Format D raw export payload (Cloud JSON)
├── src/
│   ├── app.ts                  # Express application setup & middleware registration
│   ├── server.ts               # Server startup listener
│   ├── controllers/            # HTTP Controller handlers
│   │   ├── customer.controller.ts
│   │   ├── policy.controller.ts
│   │   └── integration.controller.ts
│   ├── data/                   # Pre-seeded InsurTech database (Carriers, Insureds, Policies)
│   │   └── seedData.ts
│   ├── middleware/             # Centralized error handling and security
│   │   └── errorHandler.ts
│   ├── routes/                 # Express REST endpoint routing
│   │   ├── customer.routes.ts
│   │   ├── policy.routes.ts
│   │   ├── integration.routes.ts
│   │   └── index.ts
│   ├── scripts/                # Standalone migration test runner
│   │   └── testImport.ts
│   ├── services/               # Core AMS business logic, Dec-page & Deduplication engine
│   │   ├── ams.service.ts
│   │   └── deduplication.engine.ts
│   ├── transformers/           # Crosswalk Transformation Module
│   │   ├── base.transformer.ts
│   │   ├── formatA.transformer.ts
│   │   ├── formatB.transformer.ts
│   │   ├── formatC.transformer.ts
│   │   ├── formatD.transformer.ts
│   │   └── crosswalk.engine.ts
│   └── types/                  # Canonical Domain & Legacy Interface definitions
│       ├── domain.ts
│       └── legacy.ts
└── tests/                      # Jest Unit & Integration Test Suite (100% Passing)
    ├── customer.routes.test.ts
    ├── deduplication.test.ts
    ├── formatD.transformer.test.ts
    ├── health.test.ts
    ├── integration.routes.test.ts
    └── policy.routes.test.ts
```

---

## ⚡ Legacy Ingestion & Crosswalk Module

The crosswalk engine normalizes disparate legacy data formats into canonical AMS entities:

| Legacy System Format | Legacy Primary Key | Target AMS Customer ID | LOB Mapping Example | Currency / Premium Normalization |
| :--- | :--- | :--- | :--- | :--- |
| **Format A** | `Client_PK` / `ClientCode` | `CUST-FMT-A-{Client_PK}` | `AUTOC` -> `Commercial Auto` | Float dollars |
| **Format B** | `CUST_ID` / `CLIENT_NO` | `CUST-FMT-B-{CUST_ID}` | `WORKCOMP` -> `Workers Comp` | Compact YYYYMMDD string |
| **Format C** | `ClientNum` / `FileID` | `CUST-FMT-C-{ClientNum}` | `Personal Auto` -> `Personal Auto` | ISO date string |
| **Format D** | `account_uuid` | `CUST-FMT-D-{account_uuid}` | `COMM_AUTO` -> `Commercial Auto` | Cents float converted to dollars ($) |

### 🔍 Smart Deduplication Engine
Compares incoming legacy candidates against pre-existing `CoreAMS` customers by FEIN/SSN, Exact/Normalized Name, and Postal Code:
- **100% FEIN Match**: Generates high-confidence warning and links imported policies directly to the pre-existing Core AMS Customer ID without duplicating customer records.
- **Dry-Run Analysis Mode (`POST /api/v1/integration/dry-run`)**: Evaluates transformations, generates field mapping logs, highlights warnings/exceptions, and reports deduplication matches **without modifying the Core AMS database**.

---

## 🐳 Docker & Local Execution Guide

### Step 1: Start Application
```bash
npm run dev
# OR containerized:
docker compose up --build -d
```

### Step 2: Open Interactive Workbench
Visit `http://localhost:6000` in your web browser to interact with the **CoreAMS Migration Workbench Dashboard**.

---

## 🧪 Comprehensive API Test Suite (curl Commands)

### 1. Health Check
```bash
curl -s http://localhost:6000/health
```

### 2. Search Customers
```bash
curl -s "http://localhost:6000/api/v1/customers?name=Apex"
```

### 3. Generate ACORD 125/126 Dec-Page
```bash
curl -s "http://localhost:6000/api/v1/policies/POL-CA-2026-001/dec-page"
```

### 4. Perform Migration Dry-Run Preview
```bash
curl -s -X POST http://localhost:6000/api/v1/integration/dry-run \
  -H "Content-Type: application/json" \
  -d @sample_payloads/format_d_payload.json
```

### 5. Execute Format D Migration Import
```bash
curl -s -X POST http://localhost:6000/api/v1/integration/import \
  -H "Content-Type: application/json" \
  -d @sample_payloads/format_d_payload.json
```

### 6. View Crosswalk Mapping Matrix
```bash
curl -s http://localhost:6000/api/v1/integration/crosswalk-matrix
```

---

## 🛠 Local Test Suite & CI Automation

```bash
# Run unit and integration tests
npm test

# Run standalone legacy migration runner
npm run test:import

# Typecheck build
npx tsc --noEmit
```

## ⚙️ Continuous Integration (GitHub Actions)

A GitHub Actions workflow is configured in [.github/workflows/ci.yml](file:///c:/Users/johns/DEV/ams-proto/.github/workflows/ci.yml) to automatically validate every push or pull request targeting the `main` branch. Merges to `main` are automatically blocked unless 100% of unit tests pass, TypeScript builds cleanly, and import script tests pass.

