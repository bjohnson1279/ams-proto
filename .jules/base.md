# Shared Jules Agent Operational Directives & Core Invariants

This document defines the common architectural guardrails, verification directives, and operational constraints enforced across all Jules development agents (Bolt, Palette, Sentinel).

---

## 1. Core Architectural Constraints
- **Autonomous Execution**: Proceed directly to PR submission once changes are implemented, relevant test fixtures pass, and architectural invariants are verified.
- **Surgical Edits Only**: Use strictly range-scoped replacements. Never run whole-file code formatters (Prettier, Black, Pint, rustfmt) across unmodified lines to prevent noisy git blame churn and merge conflicts.
- **Zero Scratch Artifacts**: Never stage or commit temporary verification scripts (`test.cjs`, `fix_*.cjs`, `fix_*.php`, `patch_*.py`, `patch_*.sh`, `scratch_*`, `plan.md`). Execute checks via the project's native test commands and clean up before creating commits.
- **Multi-Tenant Isolation in Aggregates**: When adding or optimizing aggregate/count queries (`getCount`, `getCertificateCount`, `getInvoiceCount`), ALWAYS scope results by `tenantId` in both SQL/database implementations (`WHERE tenant_id = $1`) and in-memory repositories (`(!item.tenantId || item.tenantId === tenantId)`). Never return raw unfiltered array lengths (`this.items.length`).
- **Never Weaken CI Workflows**: Do not modify `.github/workflows/**` to bypass failures (e.g. adding `|| true`, setting `continue-on-error: true`, or commenting out assertions). Always resolve the defect in the source code or test fixture.

## 2. Completeness & Verification Directives
- **Explicit Parameter & Contract Validation**: When creating or modifying API endpoints, always implement explicit parameter and request body validation schemas (e.g. `z.string().uuid()`) to prevent unhandled 404/500 fallthroughs.
- **Self-Verification Before Commit**: Always run syntax checks (`bash -n` for shell scripts, `tsc --noEmit` for TypeScript, linter checks) and targeted test runners locally before opening or updating a PR.
- **Strict Typing in TypeScript**: Avoid implicit `any` by always providing explicit types on functions, parameters, and arrow callbacks (e.g. `(id: string) => ...`). Verify zero type errors with `tsc --noEmit`.

## 3. Hallucinatory Task & Zero-Diff Guardrails
- **Zero-Diff Task Termination**: If the requested optimization, refactor, or fix is ALREADY natively present in the target branch, DO NOT create an empty pull request or commit an acknowledgment PR. Exit cleanly without opening a PR.
- **No Journal-Only PRs**: Never open a pull request that only contains updates to `.jules/*.md` files without corresponding functional code changes and tests.
- **Stale Suggestion Guard**: Always verify the current code on `main` before planning changes. If no actionable diff is required, cancel task execution immediately.

## 4. Coupled Test Maintenance
- **Synchronized Assertions**: Any functional change to return types, query methods, error response sanitization, or DOM structure MUST be accompanied by updates to existing unit and integration test fixtures in `tests/` in the same commit.
- **Never Leave Broken Test Mocks**: When changing fail-open fallback behavior (such as hardening decryption or sanitizing error messages), always update upstream test mocks that rely on plaintext credentials or raw exception messages.

## 5. Domain Disjointness & Boundaries
- **Bolt (Performance)**: Backend algorithmic complexity ($\mathcal{O}(N) \to \mathcal{O}(1)$), query indexing, loop hoisting, and GC overhead. Do NOT modify frontend HTML templates or security authentication middleware.
- **Palette (UX & Accessibility)**: Frontend DOM, ARIA attributes, keyboard navigation, empty states, and WCAG 2.1 compliance. Do NOT modify database schemas, backend routing, or server security filters.
- **Sentinel (Security)**: Security invariant preservation, CORS/middleware hardening, cryptographic identifier generation (`crypto.randomUUID()`), SQL injection prevention, and HTTP response sanitization. Do NOT perform cosmetic UI redesigns.

- **Strict Lowercase Directory Casing**: Always write learning notes to lowercase `.jules/<bot>.md`. Never create, commit, or reference uppercase `.Jules/`.

- **Clean Markdown Formatting**: Always append journal entries using actual newline characters, never literal string escape sequences `\n`.
