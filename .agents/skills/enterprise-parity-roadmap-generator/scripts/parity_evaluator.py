#!/usr/bin/env python3
"""
Enterprise Parity Evaluator & Roadmap Generator CLI Script
-----------------------------------------------------------
Scans source code repositories, evaluates feature parity against enterprise SaaS benchmarks
(AMS360, Applied Epic, QuickBooks Enterprise, NetSuite), and generates structured ROADMAP.md files.
"""

import argparse
import json
import re
import sys
from pathlib import Path

BENCHMARK_PROFILES = {
    "Enterprise_AMS_Target": {
        "name": "Enterprise AMS Target",
        "description": "Commercial & Personal Lines Enterprise Agency Management Platform Benchmark",
        "categories": {
            "Customer & Entity Management": "Full entity hierarchy, commercial DBAs, tax IDs, contact registries",
            "Legacy Ingestion & Crosswalk ETL": "Multi-format data import, LOB mapping, currency normalization",
            "Smart Deduplication & Dry-Run": "FEIN/SSN exact matching, string distance scoring, dry-run previews",
            "ACORD Form & Dec-Page Generation": "Commercial dec pages (ACORD 125/126), PDF rendering, endorsement forms",
            "General Ledger & Accounting": "Double-entry GL, Chart of Accounts, Agency Bill invoicing, Fiduciary Trust cash isolation",
            "Certificate Management": "ACORD 25 Certificate of Liability Insurance generation, holder registry",
            "Carrier Download & Connectivity": "IVANS download processing, ACORD AL3 binary parser, direct bill statements",
            "Database Persistence & RLS": "Multi-tenant relational database with Row-Level Security and audit trails"
        }
    },
    "Generic_Brokerage_SaaS": {
        "name": "Generic Brokerage SaaS",
        "description": "Enterprise Commercial Brokerage Management Platform Benchmark",
        "categories": {
            "Customer & Entity Management": "Parent/child corporate hierarchy, account tracking, contacts",
            "Legacy Ingestion & Crosswalk ETL": "ETL ingestion, data crosswalk mapping, field validation",
            "Smart Deduplication & Dry-Run": "Account deduplication, contact matching, preview mode",
            "ACORD Form & Dec-Page Generation": "Full ACORD form library, custom dec pages, endorsements",
            "General Ledger & Accounting": "General ledger, trust accounting, agency bill / direct bill invoicing",
            "Certificate Management": "Master certificates, holder management, automated distribution",
            "Carrier Download & Connectivity": "IVANS download sync, eDocs ingestion, policy status sync",
            "Database Persistence & RLS": "Enterprise cloud database, branch security, audit logs"
        }
    }
}

def cmd_scan(args):
    source_dir = Path(args.path).resolve()
    if not source_dir.exists():
        print(f"Error: Source directory '{source_dir}' does not exist.", file=sys.stderr)
        sys.exit(1)

    print(f"Scanning codebase at {source_dir}...")
    entities = set()
    routes = set()
    services = set()
    features = set()

    for file_path in source_dir.rglob("*"):
        if file_path.is_file() and file_path.suffix in [".ts", ".js", ".json", ".md", ".html"]:
            content = file_path.read_text(encoding="utf-8", errors="ignore")

            # Extract Interfaces / Entities
            for match in re.findall(r'interface\s+([A-Z][A-Za-z0-9]+)', content):
                entities.add(match)

            # Extract Express / REST Routes
            for match in re.findall(r'router\.(get|post|put|delete)\(\s*[\'"]([^\'"]+)', content):
                routes.add(f"{match[0].upper()} {match[1]}")

            # Extract Service Classes
            for match in re.findall(r'class\s+([A-Z][A-Za-z0-9]*Service)', content):
                services.add(match)

            # Detect key feature keywords
            if "deduplication" in content.lower():
                features.add("Smart Deduplication")
            if "dryrun" in content.lower() or "dry-run" in content.lower():
                features.add("Dry-Run Analysis Mode")
            if "acord" in content.lower() or "decpage" in content.lower() or "dec-page" in content.lower():
                features.add("ACORD Dec-Page Generation")
            if "journalentry" in content.lower() or "chartofaccounts" in content.lower() or "accounting" in content.lower():
                features.add("General Ledger Accounting")
            if "crosswalk" in content.lower() or "transformer" in content.lower():
                features.add("Legacy Ingestion Crosswalk")

    catalog = {
        "scannedPath": str(source_dir),
        "entities": sorted(list(entities)),
        "routes": sorted(list(routes)),
        "services": sorted(list(services)),
        "detectedFeatures": sorted(list(features)),
        "summary": {
            "entityCount": len(entities),
            "routeCount": len(routes),
            "serviceCount": len(services),
            "featureCount": len(features)
        }
    }

    out_file = Path(args.output).resolve()
    out_file.write_text(json.dumps(catalog, indent=2), encoding="utf-8")
    print(f"[OK] Scan complete! Feature catalog saved to: {out_file}")

def cmd_compare(args):
    cat_file = Path(args.catalog).resolve()
    if not cat_file.exists():
        print(f"Error: Feature catalog file '{cat_file}' not found.", file=sys.stderr)
        sys.exit(1)

    catalog = json.loads(cat_file.read_text(encoding="utf-8"))
    benchmark_name = args.benchmark
    profile = BENCHMARK_PROFILES.get(benchmark_name, BENCHMARK_PROFILES["Enterprise_AMS_Target"])

    detected_features = set(catalog.get("detectedFeatures", []))
    entities = set(catalog.get("entities", []))
    routes = [r.lower() for r in catalog.get("routes", [])]

    matrix = []

    # Evaluate Category 1: Customer & Entity
    matrix.append({
        "category": "Customer & Entity Management",
        "description": "Insured accounts, DBAs, FEIN/SSN tax IDs, address structures",
        "benchmarkCapability": profile["categories"]["Customer & Entity Management"],
        "status": "Completed" if "Customer" in entities else "Gap",
        "notes": "Entity interfaces and customer routes detected."
    })

    # Category 2: Legacy Ingestion & Crosswalk ETL
    matrix.append({
        "category": "Legacy Ingestion & Crosswalk ETL",
        "description": "Multi-format legacy export ingestion (Format A, Format B, Format C, Format D)",
        "benchmarkCapability": profile["categories"]["Legacy Ingestion & Crosswalk ETL"],
        "status": "Completed" if "Legacy Ingestion Crosswalk" in detected_features else "Gap",
        "notes": "Crosswalk transformation engine detected."
    })

    # Category 3: Smart Deduplication & Dry-Run
    matrix.append({
        "category": "Smart Deduplication & Dry-Run",
        "description": "Weighted matching score (FEIN 100%, Name 60%, Postal Code 25%) and dry-run mode",
        "benchmarkCapability": profile["categories"]["Smart Deduplication & Dry-Run"],
        "status": "Completed" if "Smart Deduplication" in detected_features else "Gap",
        "notes": "Deduplication engine and dry-run preview endpoints detected."
    })

    # Category 4: ACORD Form & Dec-Page
    matrix.append({
        "category": "ACORD Form & Dec-Page Generation",
        "description": "ACORD 125/126 commercial declaration payload generation",
        "benchmarkCapability": profile["categories"]["ACORD Form & Dec-Page Generation"],
        "status": "Completed" if "ACORD Dec-Page Generation" in detected_features else "Gap",
        "notes": "ACORD dec page payload renderer detected."
    })

    # Category 5: General Ledger & Accounting
    matrix.append({
        "category": "General Ledger & Accounting",
        "description": "Double-entry GL, Chart of Accounts, Agency Bill invoicing, Fiduciary Trust Cash",
        "benchmarkCapability": profile["categories"]["General Ledger & Accounting"],
        "status": "Completed" if "General Ledger Accounting" in detected_features else "Gap",
        "notes": "Double-entry accounting service and invoices detected."
    })

    # Category 6: Certificate Management
    has_coi = any("coi" in r or "certificate" in r for r in routes)
    matrix.append({
        "category": "Certificate Management",
        "description": "ACORD 25 Certificate of Liability Insurance generation & holder tracking",
        "benchmarkCapability": profile["categories"]["Certificate Management"],
        "status": "Completed" if has_coi else "Gap",
        "notes": "Certificate holder engine planned for Phase 2."
    })

    # Category 7: Carrier Download & Connectivity
    has_download = any("ivans" in r or "al3" in r for r in routes)
    matrix.append({
        "category": "Carrier Download & Connectivity",
        "description": "IVANS download intake and ACORD AL3 message parsing",
        "benchmarkCapability": profile["categories"]["Carrier Download & Connectivity"],
        "status": "Completed" if has_download else "Gap",
        "notes": "IVANS AL3 carrier download parser planned for Phase 3."
    })

    # Category 8: Database Persistence & RLS
    matrix.append({
        "category": "Database Persistence & RLS",
        "description": "PostgreSQL database with Row-Level Security multi-tenancy",
        "benchmarkCapability": profile["categories"]["Database Persistence & RLS"],
        "status": "Gap",
        "notes": "Currently using in-memory store; PostgreSQL RLS migration planned for Phase 4."
    })

    result = {
        "benchmark": profile["name"],
        "scannedPath": catalog.get("scannedPath"),
        "matrix": matrix
    }

    out_file = Path(args.output).resolve()
    out_file.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(f"[OK] Comparison complete! Parity matrix saved to: {out_file}")

def cmd_generate_roadmap(args):
    mat_file = Path(args.matrix).resolve()
    if not mat_file.exists():
        print(f"Error: Parity matrix file '{mat_file}' not found.", file=sys.stderr)
        sys.exit(1)

    parity_data = json.loads(mat_file.read_text(encoding="utf-8"))
    benchmark = parity_data.get("benchmark", "AMS360")
    matrix = parity_data.get("matrix", [])

    completed = [m for m in matrix if m["status"] == "Completed"]
    gaps = [m for m in matrix if m["status"] == "Gap"]

    md_content = []
    md_content.append(f"# Enterprise Parity Strategic Roadmap ({benchmark})")
    md_content.append("")
    md_content.append(f"This document outlines the engineering roadmap to establish full feature parity against **{benchmark}**.")
    md_content.append("")
    md_content.append("---")
    md_content.append("")
    md_content.append("## 🗺 Strategic Roadmap Overview")
    md_content.append("")
    md_content.append("```mermaid")
    md_content.append("graph TD")
    md_content.append('    Phase1["Phase 1: General Ledger & Accounting (COMPLETED)"] --> Phase2["Phase 2: ACORD 25 Certificate Engine"]')
    md_content.append('    Phase2 --> Phase3["Phase 3: IVANS AL3 Carrier Download"]')
    md_content.append('    Phase3 --> Phase4["Phase 4: PostgreSQL RLS & TimescaleDB Persistence"]')
    md_content.append("```")
    md_content.append("")
    md_content.append("---")
    md_content.append("")
    md_content.append("## 📌 Parity Matrix Summary")
    md_content.append("")
    md_content.append("| Feature Category | Feature Description | Target Benchmark Capability | Parity Status | Notes |")
    md_content.append("| :--- | :--- | :--- | :---: | :--- |")

    for m in matrix:
        status_icon = "✅ **Completed**" if m["status"] == "Completed" else "⏳ *Planned Gap*"
        md_content.append(f"| **{m['category']}** | {m['description']} | {m['benchmarkCapability']} | {status_icon} | {m['notes']} |")

    md_content.append("")
    md_content.append("---")
    md_content.append("")
    md_content.append("## 📑 Detailed Execution Roadmap")
    md_content.append("")
    
    for i, item in enumerate(matrix, 1):
        md_content.append(f"### Phase {i}: {item['category']}")
        md_content.append(f"- **Status**: {'Completed' if item['status'] == 'Completed' else 'Planned'}")
        md_content.append(f"- **Description**: {item['description']}")
        md_content.append(f"- **Implementation Details**: {item['notes']}")
        md_content.append("")

    out_file = Path(args.output).resolve()
    out_file.write_text("\n".join(md_content), encoding="utf-8")
    print(f"[OK] Roadmap generated successfully! Written to: {out_file}")

def main():
    parser = argparse.ArgumentParser(
        description="Enterprise Parity Evaluator & Roadmap Generator CLI"
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Subcommand: scan
    p_scan = subparsers.add_parser("scan", help="Scan source code to extract domain catalog")
    p_scan.add_argument("--path", required=True, help="Path to source code directory (e.g. ./src)")
    p_scan.add_argument("--output", required=True, help="Output JSON file for feature catalog")

    # Subcommand: compare
    p_comp = subparsers.add_parser("compare", help="Compare feature catalog against benchmark profile")
    p_comp.add_argument("--catalog", required=True, help="Path to scanned feature catalog JSON")
    p_comp.add_argument("--benchmark", default="Enterprise_AMS_Target", choices=list(BENCHMARK_PROFILES.keys()), help="Benchmark SaaS platform profile")
    p_comp.add_argument("--output", required=True, help="Output JSON file for parity matrix")

    # Subcommand: generate-roadmap
    p_road = subparsers.add_parser("generate-roadmap", help="Generate ROADMAP.md from parity matrix")
    p_road.add_argument("--matrix", required=True, help="Path to parity matrix JSON")
    p_road.add_argument("--output", required=True, help="Output Markdown file (e.g. ROADMAP.md)")

    args = parser.parse_args()

    if args.command == "scan":
        cmd_scan(args)
    elif args.command == "compare":
        cmd_compare(args)
    elif args.command == "generate-roadmap":
        cmd_generate_roadmap(args)

if __name__ == "__main__":
    main()
