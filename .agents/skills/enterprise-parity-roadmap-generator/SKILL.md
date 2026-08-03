---
name: enterprise-parity-roadmap-generator
description: >-
  Scans application source code, evaluates domain feature parity against commercial enterprise SaaS benchmarks (AMS360, Applied Epic, QuickBooks Enterprise, NetSuite), and generates structured ROADMAP.md documents and implementation plans.
---

# Enterprise Parity Evaluator & Roadmap Generator

## Overview

The `enterprise-parity-roadmap-generator` skill enables agents to inspect a repository's domain models, API routes, and services, compare feature coverage against commercial enterprise SaaS benchmarks (`Enterprise_AMS_Target`, `Generic_Brokerage_SaaS`, `QuickBooks Enterprise`), and generate structured feature parity matrices and multi-phase `ROADMAP.md` files.

---

## Quick Start

Run the helper CLI script `.agents/skills/enterprise-parity-roadmap-generator/scripts/parity_evaluator.py` to perform full scanning, comparison, and roadmap generation:

```bash
# Step 1: Scan codebase to extract domain feature catalog
python .agents/skills/enterprise-parity-roadmap-generator/scripts/parity_evaluator.py scan --path ./src --output feature_catalog.json

# Step 2: Compare catalog against enterprise benchmark profile
python .agents/skills/enterprise-parity-roadmap-generator/scripts/parity_evaluator.py compare --catalog feature_catalog.json --benchmark Enterprise_AMS_Target --output parity_matrix.json

# Step 3: Generate multi-phase ROADMAP.md document
python .agents/skills/enterprise-parity-roadmap-generator/scripts/parity_evaluator.py generate-roadmap --matrix parity_matrix.json --output ROADMAP.md
```

---

## Utility Scripts

The CLI script `parity_evaluator.py` provides three primary subcommands:

### 1. `scan`
Scans `./src` files (`.ts`, `.js`, `.json`, `.md`) to extract interfaces, Express REST routes, service classes, and key domain features.

- **Required Arguments**:
  - `--path`: Target source directory (e.g., `./src`).
  - `--output`: File path to save scanned catalog JSON (e.g., `catalog.json`).

### 2. `compare`
Evaluates the scanned feature catalog against commercial SaaS benchmark profiles (`Enterprise_AMS_Target`, `Generic_Brokerage_SaaS`).

- **Required Arguments**:
  - `--catalog`: Path to input feature catalog JSON.
  - `--benchmark`: SaaS system profile (`Enterprise_AMS_Target`, `Generic_Brokerage_SaaS`).
  - `--output`: File path to save parity matrix JSON.

### 3. `generate-roadmap`
Transforms the parity matrix JSON into a GitHub Flavored Markdown `ROADMAP.md` document complete with Mermaid graphs, summary tables, and detailed phase specifications.

- **Required Arguments**:
  - `--matrix`: Path to input parity matrix JSON.
  - `--output`: File path to save Markdown roadmap (e.g., `ROADMAP.md`).

---

## Agent Workflow

When invoked to perform a feature evaluation or update an enterprise roadmap:

1. **Execute CLI Scanner**:
   Run `parity_evaluator.py scan` to extract the latest domain entities and endpoints from `./src`.

2. **Execute Benchmark Comparison**:
   Run `parity_evaluator.py compare` against the target benchmark (e.g., `Enterprise_AMS_Target`).

3. **Generate ROADMAP.md**:
   Run `parity_evaluator.py generate-roadmap` to update `ROADMAP.md` in the project root.

4. **Present Implementation Plan**:
   Present the resulting parity matrix and phase roadmap to the user via an `implementation_plan.md` artifact for review.

---

## Common Mistakes & Pitfalls

- **Manual Feature Guessing**: Never guess or hardcode missing features without scanning actual route handlers and domain types first.
- **Overwriting Active Roadmaps**: Always check if a `ROADMAP.md` file exists before overwriting, or update existing phase statuses cleanly.
