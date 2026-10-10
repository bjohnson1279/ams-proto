#!/usr/bin/env python3
"""
Smart Union Merge Tool for Markdown Agent Logs (.jules/*.md) & Test Suites
==========================================================================
Intelligently merges .jules/ and markdown agent logs without manual conflict surgery:
- Additively preserves timestamped learning entries (## YYYY-MM-DD - ...)
- Normalizes and de-duplicates learning entries
- Retains prevention & guardrail directives at the bottom of the document
- Merges bullet points under identical directive headers additively
- Resolves in-place Git conflict markers (<<<<<<<, =======, >>>>>>>)
- Auto-splices non-overlapping test methods in test fixtures
- Can be invoked standalone, via CLI, or as a Git custom merge driver (%O %A %B %P)
"""

import argparse
import os
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

# Ensure UTF-8 console output on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')


DATED_SECTION_RE = re.compile(r"^##\s+(\d{4}-\d{2}-\d{2})\s*[-:]\s*(.+)$")
GENERIC_H2_RE = re.compile(r"^##\s+(.+)$")
CONFLICT_START_RE = re.compile(r"^<{7}\s*(.*)$")
CONFLICT_MID_RE = re.compile(r"^={7}\s*$")
CONFLICT_BASE_RE = re.compile(r"^\|{7}\s*(.*)$")
CONFLICT_END_RE = re.compile(r"^>{7}\s*(.*)$")


def normalize_title(title: str) -> str:
    """Normalizes title for deduplication: lowercase, alphanumeric only."""
    return re.sub(r"[^a-z0-9]", "", title.lower())


class LearningSection:
    def __init__(self, date: str, title: str, full_header: str, body: str):
        self.date = date
        self.title = title
        self.full_header = full_header.strip()
        self.body = body.strip()

    @property
    def key(self) -> str:
        return f"{self.date}:{normalize_title(self.title)}"

    def to_markdown(self) -> str:
        if self.body:
            return f"{self.full_header}\n{self.body}"
        return self.full_header


class DirectiveSection:
    def __init__(self, title: str, full_header: str, body: str):
        self.title = title
        self.full_header = full_header.strip()
        self.body = body.strip()

    @property
    def key(self) -> str:
        return normalize_title(self.title)

    def merge_with(self, other: "DirectiveSection") -> "DirectiveSection":
        """Merges two directive sections by unioning bullet points and unique lines."""
        lines_a = [l.strip() for l in self.body.splitlines() if l.strip()]
        lines_b = [l.strip() for l in other.body.splitlines() if l.strip()]

        merged_lines = []
        seen = set()

        for line in lines_a + lines_b:
            norm = re.sub(r"^[-*+]\s*", "", line).strip()
            if norm and norm not in seen:
                seen.add(norm)
                merged_lines.append(line)

        new_body = "\n".join(merged_lines)
        return DirectiveSection(self.title, self.full_header, new_body)

    def to_markdown(self) -> str:
        if self.body:
            return f"{self.full_header}\n{self.body}"
        return self.full_header


class MarkdownDocument:
    def __init__(self):
        self.preamble: str = ""
        self.learnings: Dict[str, LearningSection] = {}
        self.directives: Dict[str, DirectiveSection] = {}
        self.order: List[str] = []

    def add_learning(self, section: LearningSection):
        if section.key not in self.learnings:
            self.learnings[section.key] = section
            self.order.append(section.key)
        else:
            existing = self.learnings[section.key]
            if len(section.body) > len(existing.body):
                self.learnings[section.key] = section

    def add_directive(self, section: DirectiveSection):
        if section.key not in self.directives:
            self.directives[section.key] = section
        else:
            self.directives[section.key] = self.directives[section.key].merge_with(section)

    def to_markdown(self) -> str:
        parts = []
        if self.preamble.strip():
            parts.append(self.preamble.strip())

        for key in self.order:
            if key in self.learnings:
                parts.append(self.learnings[key].to_markdown())

        for key, directive in self.directives.items():
            parts.append(directive.to_markdown())

        return "\n\n".join(parts).strip() + "\n"


def parse_clean_markdown(text: str) -> MarkdownDocument:
    """Parses a markdown string without conflict markers into a MarkdownDocument."""
    doc = MarkdownDocument()
    if not text or not text.strip():
        return doc

    blocks = re.split(r"(?m)(?=^##\s+)", text.strip())
    preamble_parts = []

    for block in blocks:
        b_str = block.strip()
        if not b_str:
            continue

        lines = b_str.splitlines()
        first_line = lines[0].strip()
        body = "\n".join(lines[1:]).strip() if len(lines) > 1 else ""

        dated_match = DATED_SECTION_RE.match(first_line)
        if dated_match:
            date_str = dated_match.group(1).strip()
            title_str = dated_match.group(2).strip()
            doc.add_learning(LearningSection(date_str, title_str, first_line, body))
        elif GENERIC_H2_RE.match(first_line):
            h2_match = GENERIC_H2_RE.match(first_line)
            title_str = h2_match.group(1).strip()
            doc.add_directive(DirectiveSection(title_str, first_line, body))
        else:
            preamble_parts.append(b_str)

    if preamble_parts:
        doc.preamble = "\n\n".join(preamble_parts)

    return doc


def extract_sides_from_conflicted_text(conflicted_text: str) -> Tuple[str, str]:
    """Extracts 'ours' and 'theirs' complete versions of a file from in-place conflict markers."""
    ours_lines = []
    theirs_lines = []
    in_ours = False
    in_theirs = False
    in_base = False

    for line in conflicted_text.splitlines():
        if CONFLICT_START_RE.match(line):
            in_ours = True
            in_theirs = False
            in_base = False
            continue
        elif CONFLICT_BASE_RE.match(line):
            in_base = True
            in_ours = False
            in_theirs = False
            continue
        elif CONFLICT_MID_RE.match(line):
            in_theirs = True
            in_ours = False
            in_base = False
            continue
        elif CONFLICT_END_RE.match(line):
            in_ours = False
            in_theirs = False
            in_base = False
            continue

        if in_base:
            continue
        elif in_ours:
            ours_lines.append(line)
        elif in_theirs:
            theirs_lines.append(line)
        else:
            ours_lines.append(line)
            theirs_lines.append(line)

    return "\n".join(ours_lines), "\n".join(theirs_lines)


def smart_union_texts(ours_text: str, theirs_text: str, ancestor_text: Optional[str] = None) -> str:
    """Unions learnings and directives from ours and theirs texts."""
    doc_ours = parse_clean_markdown(ours_text)
    doc_theirs = parse_clean_markdown(theirs_text)

    merged = MarkdownDocument()
    merged.preamble = doc_ours.preamble or doc_theirs.preamble

    for key in doc_ours.order:
        merged.add_learning(doc_ours.learnings[key])

    for key in doc_theirs.order:
        merged.add_learning(doc_theirs.learnings[key])

    for key, directive in doc_ours.directives.items():
        merged.add_directive(directive)

    for key, directive in doc_theirs.directives.items():
        merged.add_directive(directive)

    return merged.to_markdown()


def has_git_conflict_markers(text: str) -> bool:
    """Checks if text contains Git conflict markers."""
    for line in text.splitlines():
        if CONFLICT_START_RE.match(line) or CONFLICT_MID_RE.match(line) or CONFLICT_END_RE.match(line):
            return True
    return False


TEST_METHOD_RES = [
    re.compile(r"^\s*(?:public|protected|private)?\s*function\s+([a-zA-Z0-9_]+)\s*\("),
    re.compile(r"^\s*def\s+([a-zA-Z0-9_]+)\s*\("),
    re.compile(r"^\s*(?:it|test)\s*\(\s*['\"]([^'\"]+)['\"]"),
]


def extract_test_methods(text: str) -> Set[str]:
    methods = set()
    for line in text.splitlines():
        for r in TEST_METHOD_RES:
            m = r.search(line)
            if m:
                methods.add(m.group(1).strip())
    return methods


def is_test_file(file_path: str) -> bool:
    p = str(file_path).replace("\\", "/").lower()
    return (
        any(x in p for x in ['/tests/', '/__tests__/', '/test/'])
        or any(p.endswith(ext) for ext in ['test.php', '_test.py', 'test.ts', 'test.js', 'spec.ts', 'spec.js'])
    )


def splice_test_conflict_markers(content: str) -> Tuple[bool, str]:
    """Splices Git conflict markers in a test file if conflicting blocks contain disjoint test methods."""
    lines = content.splitlines(keepends=True)
    out = []
    i = 0
    total_conflicts = 0
    resolved_conflicts = 0

    while i < len(lines):
        line = lines[i]
        if CONFLICT_START_RE.match(line):
            total_conflicts += 1
            ours_lines = []
            theirs_lines = []
            i += 1
            while i < len(lines) and not CONFLICT_MID_RE.match(lines[i]):
                if CONFLICT_BASE_RE.match(lines[i]):
                    while i < len(lines) and not CONFLICT_MID_RE.match(lines[i]):
                        i += 1
                    break
                ours_lines.append(lines[i])
                i += 1
            if i < len(lines) and CONFLICT_MID_RE.match(lines[i]):
                i += 1
            while i < len(lines) and not CONFLICT_END_RE.match(lines[i]):
                theirs_lines.append(lines[i])
                i += 1
            if i < len(lines) and CONFLICT_END_RE.match(lines[i]):
                i += 1

            ours_text = "".join(ours_lines)
            theirs_text = "".join(theirs_lines)

            ours_methods = extract_test_methods(ours_text)
            theirs_methods = extract_test_methods(theirs_text)

            if ours_methods and theirs_methods and not (ours_methods & theirs_methods):
                out.append(ours_text)
                if not ours_text.endswith("\n") and not ours_text.endswith("\r\n"):
                    out.append("\n")
                out.append(theirs_text)
                resolved_conflicts += 1
            else:
                out.append(line)
                out.extend(ours_lines)
                out.append("=======\n")
                out.extend(theirs_lines)
                out.append(">>>>>>>\n")
        else:
            out.append(line)
            i += 1

    return (total_conflicts > 0 and resolved_conflicts == total_conflicts), "".join(out)


def resolve_in_place_file(file_path: str) -> bool:
    """Reads a conflicted file, unions its contents additively, and rewrites the resolved file."""
    path = Path(file_path)
    if not path.is_file():
        print(f"❌ File not found: {file_path}", file=sys.stderr)
        return False

    content = path.read_text(encoding="utf-8", errors="replace")
    if not has_git_conflict_markers(content):
        print(f"ℹ️ No conflict markers found in: {file_path}")
        return True

    if is_test_file(str(file_path)):
        spliced_ok, spliced_text = splice_test_conflict_markers(content)
        if spliced_ok and not has_git_conflict_markers(spliced_text):
            path.write_text(spliced_text, encoding="utf-8")
            print(f"✅ Cleanly auto-spliced disjoint test methods in: {file_path}")
            return True

    ours_text, theirs_text = extract_sides_from_conflicted_text(content)
    resolved_text = smart_union_texts(ours_text, theirs_text)

    if has_git_conflict_markers(resolved_text):
        print(f"❌ Failed to strip all conflict markers in {file_path}", file=sys.stderr)
        return False

    path.write_text(resolved_text, encoding="utf-8")
    print(f"✅ Cleanly resolved conflicts in: {file_path}")
    return True


def git_merge_driver(ancestor_path: str, ours_path: str, theirs_path: str, pathname: str) -> int:
    """Git custom merge driver implementation (%O %A %B %P)."""
    try:
        ancestor_text = Path(ancestor_path).read_text(encoding="utf-8", errors="replace") if os.path.exists(ancestor_path) else ""
        ours_text = Path(ours_path).read_text(encoding="utf-8", errors="replace") if os.path.exists(ours_path) else ""
        theirs_text = Path(theirs_path).read_text(encoding="utf-8", errors="replace") if os.path.exists(theirs_path) else ""

        if has_git_conflict_markers(ours_text):
            o_side, t_side = extract_sides_from_conflicted_text(ours_text)
            resolved = smart_union_texts(o_side, t_side)
        else:
            resolved = smart_union_texts(ours_text, theirs_text, ancestor_text=ancestor_text)

        Path(ours_path).write_text(resolved, encoding="utf-8")
        print(f"✅ [Smart Union Driver] Merged: {pathname}")
        return 0
    except Exception as e:
        print(f"❌ [Smart Union Driver Error] {pathname}: {e}", file=sys.stderr)
        return 1


def main():
    parser = argparse.ArgumentParser(description="Smart Union Merge Tool for Markdown Agent Logs")
    subparsers = parser.add_subparsers(dest="command", required=True)

    p_file = subparsers.add_parser("file", help="Resolve an in-place conflicted file containing <<<<<<< markers")
    p_file.add_argument("path", help="Path to conflicted markdown file")

    p_union = subparsers.add_parser("union", help="Union two clean markdown files additively")
    p_union.add_argument("ours", help="Path to ours / current file")
    p_union.add_argument("theirs", help="Path to theirs / incoming file")
    p_union.add_argument("-o", "--output", help="Output file path (defaults to stdout)")

    p_driver = subparsers.add_parser("driver", help="Git custom merge driver interface (%O %A %B %P)")
    p_driver.add_argument("ancestor", help="Ancestor (%O)")
    p_driver.add_argument("ours", help="Current / Ours (%A)")
    p_driver.add_argument("theirs", help="Other / Theirs (%B)")
    p_driver.add_argument("pathname", nargs="?", default="", help="File path (%P)")

    args = parser.parse_args()

    if args.command == "file":
        success = resolve_in_place_file(args.path)
        sys.exit(0 if success else 1)

    elif args.command == "union":
        o_text = Path(args.ours).read_text(encoding="utf-8", errors="replace")
        t_text = Path(args.theirs).read_text(encoding="utf-8", errors="replace")
        res = smart_union_texts(o_text, t_text)
        if args.output:
            Path(args.output).write_text(res, encoding="utf-8")
            print(f"✅ Union written to: {args.output}")
        else:
            sys.stdout.write(res)
        sys.exit(0)

    elif args.command == "driver":
        code = git_merge_driver(args.ancestor, args.ours, args.theirs, args.pathname)
        sys.exit(code)


if __name__ == "__main__":
    main()
