#!/usr/bin/env python3
"""
PR In-Memory Merge Simulator & Pairwise Disjoint Analyzer
Simulates 3-way Git merges in-memory without checking out branches,
identifies pairwise collisions across open candidate PRs, and verifies
working tree isolation.
"""

import argparse
import json
import os
import subprocess
import sys

# Force UTF-8 on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

def run_cmd(cmd, cwd=None):
    res = subprocess.run(
        cmd,
        shell=True,
        capture_output=True,
        text=True,
        cwd=cwd,
        encoding='utf-8',
        errors='replace'
    )
    return res.stdout.strip(), res.stderr.strip(), res.returncode

def main():
    parser = argparse.ArgumentParser(description="Simulate PR merges in-memory.")
    parser.add_argument("--base", default="main", help="Base branch (default: main)")
    parser.add_argument("--repo-dir", default=".", help="Repository root directory")
    args = parser.parse_args()

    repo_dir = os.path.abspath(args.repo_dir)
    print(f"🔍 Fetching latest refs and checking open bot PRs in {repo_dir}...")
    run_cmd("git fetch origin", cwd=repo_dir)

    out, _, code = run_cmd('gh pr list --state open --json number,title,headRefName,author', cwd=repo_dir)
    if code != 0 or not out:
        print("No open PRs found or gh CLI unavailable.")
        return

    try:
        prs = json.loads(out)
    except Exception as e:
        print(f"Failed to parse PR list: {e}")
        return

    if not prs:
        print("✅ No open PRs to simulate.")
        return

    print(f"Found {len(prs)} open PR(s):")
    results = []
    for pr in prs:
        num = pr["number"]
        ref = f"origin/{pr['headRefName']}"
        title = pr.get("title", "")
        base_commit, _, c1 = run_cmd(f"git merge-base {args.base} {ref}", cwd=repo_dir)
        if c1 != 0 or not base_commit:
            print(f"  ❌ #{num}: Could not determine merge-base against {args.base}")
            continue

        merge_out, merge_err, c2 = run_cmd(f"git merge-tree {base_commit} {args.base} {ref}", cwd=repo_dir)
        has_conflicts = "<<<<<<<" in merge_out or "CONFLICT" in merge_err or c2 != 0

        diff_files, _, _ = run_cmd(f"git diff --name-only {args.base}...{ref}", cwd=repo_dir)
        files = [f.strip() for f in diff_files.splitlines() if f.strip() and not f.strip().startswith(".jules/")]

        status = "❌ CONFLICT" if has_conflicts else "✅ CLEAN"
        print(f"  [{status}] #{num} ({ref}): {len(files)} non-journal files changed")
        results.append({
            "number": num,
            "ref": ref,
            "title": title,
            "clean": not has_conflicts,
            "files": set(files)
        })

    print("\nPairwise Disjoint Set Analysis:")
    for i in range(len(results)):
        for j in range(i + 1, len(results)):
            a, b = results[i], results[j]
            overlap = a["files"].intersection(b["files"])
            if overlap:
                print(f"  ⚠️ Overlap between PR #{a['number']} and #{b['number']}: {', '.join(overlap)}")
            else:
                print(f"  ✅ PR #{a['number']} and #{b['number']} are completely disjoint")

if __name__ == "__main__":
    main()
