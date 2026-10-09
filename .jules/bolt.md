# Agent Directives & Operational Scope

## 2025-02-28 - Avoid O(M * N) and string recreation in reconciliations
**Learning:** Found nested loops and redundant string allocations (lowercasing strings) in `reconcileItems` where downloaded items are compared against all existing policies and customers. In array scanning inside a large loop, calculating `.toLowerCase()` inside `find()` on every single existing object creates many temporary string allocations, thrashing memory and degrading execution speed.
**Action:** When matching arrays against each other in $O(M \times N)$ loops, use `Map` for $O(1)$ lookups on primary keys (like `policyNumber`), and precompute derived string values outside the innermost loop.

## 2024-05-19 - Deduplication Engine String Normalization Optimization
**Learning:** String normalization (regex replace, lowercasing) inside O(N*M) loops can be a hidden bottleneck in evaluation engines like DeduplicationEngine.
**Action:** Always check if repetitive data formatting/normalization inside nested loops or frequent evaluation calls can be pre-calculated and cached upon instantiation/initialization.

## 2026-08-16 - [O(n²) to O(n) Optimization in Array Searching]
**Learning:** Replaced O(n²) nested `findIndex` operations with pre-computed O(n) hash map lookups (`Map`) in `importLegacyPayload` function (src/services/ams.service.ts), resulting in significant performance improvement, especially when large numbers of records are involved in data migrations.
**Action:** Always evaluate loops that contain nested `find` or `findIndex` operations over large data arrays and consider pre-computing index maps for O(1) lookups.

## 2026-08-17 - [Avoid Wasteful Array Copies Before Filtering]
**Learning:** Found O(N) array spreads (e.g., `[...this.customers]`) being used to create copies of large collections *before* applying `.filter()` in `getCustomers` and `getPolicies`. This forces a full memory allocation of the entire array, only to immediately discard it for the filtered result.
**Action:** When filtering collections, apply `.filter()` directly to the original collection reference first. Only use the spread operator (`[...result]`) at the very end if returning an unfiltered list and mutation protection is required.

## 2026-08-17 - Avoid Wasteful Array Copies Before Filtering in CertificateService
**Learning:** Found O(N) array spreads (e.g., `[...this.certificateHolders]`) being used to create copies of large collections *before* applying `.filter()` in `getCertificateHolders` and `getCertificates`. This forces a full memory allocation of the entire array, only to immediately discard it for the filtered result.
**Action:** When filtering collections, apply `.filter()` directly to the original collection reference first. Only use the spread operator (`[...result]`) at the very end if returning an unfiltered list and mutation protection is required.

## 2026-08-17 - Avoid O(N*M) and excessive memory mapping during data reconciliation
**Learning:** Found nested loops and redundant object spread mappings (`...c`) in `reconcileItems` where downloaded items are compared against all existing policies and customers. Constructing `customerSearchData` created a new large object for every customer, thrashing memory. Scanning the array with `.find(c => c.feinOrSsn === ...)` created a worst-case $O(N \times M)$ search path for exact matches.
**Action:** When filtering or reconciling datasets, use `Map` for $O(1)$ lookups on unique keys (like FEIN/SSN) before falling back to array scans. Also, preserve original object references (e.g., `{ customer: originalObj }`) instead of spreading (`...originalObj`) to save significant memory allocations during map pre-computation.

## 2026-08-22 - [Array Filter Consolidation]
**Learning:** Sequential `.filter()` calls on in-memory arrays create wasteful intermediate arrays and run O(K*N) iterations.
**Action:** Always combine sequential `.filter()` operations into a single loop pass to save memory allocations and CPU cycles, especially for large datasets.

## 2025-02-12 - [Pre-computing and caching string operations in frontend filtering]
**Learning:** Sequential `.toLowerCase()` conversions and redundant string concatenations within a `.filter()` loop on a large dataset executed repeatedly via keystroke events caused significant CPU/memory overhead. Caching the dataset in memory and pre-computing a single concatenated, lowercased `_searchString` reduced the filtering operation to O(1) property access and eliminated redundant backend GET requests.
**Action:** When implementing client-side search filtering on static datasets, cache the initial network response, pre-compute normalized search strings during initialization, and filter the cached dataset using those pre-computed values rather than executing transformations inline during the filter loop.

## 2026-08-26 - [O(n*m) to O(n+m) Optimization in Certificate Generation]
**Learning:** Found an `O(N)` array `.find()` operation (`carriers.find`) happening *inside* a `.forEach` loop over `selectedPolicies` in `generateCertificate` (src/services/certificate.service.ts). For each unique carrier across policies, it scanned the entire carriers array. This creates unnecessary CPU overhead, especially if the number of policies and carriers grows.
**Action:** Always pre-compute a `Map` of lookup data (like carriers by ID) *before* entering a loop, enabling `O(1)` access inside the iteration and reducing the overall time complexity from `O(N*M)` to `O(N+M)`.

## 2026-08-30 - Optimize Bulk Certificate Issue Context
**Learning:** In bulk operations calling an inner generator function inside a loop (e.g., bulkIssueCertificates calling generateCertificate), running O(H * (P + C)) database array scans per loop iteration causes severe CPU overhead.
**Action:** Pre-fetch necessary resources (customer, policies, carrier maps) outside the bulk loop and pass them as an optional context parameter to the generator function to reduce complexity to O(P + C + H).

## 2026-08-31 - Reduce O(N) array scans with single loop
**Learning:** Found multiple distinct `.find()` operations in `generateCertificate` that iterated over the same `pol.coverages` array to extract different attributes (`eachOcc` and `genAgg`).
**Action:** When evaluating arrays for multiple attributes, replace multiple distinct `.find()` operations with a single `for...of` loop with early breaks to reduce redundant O(N) array scans and CPU overhead.

## 2026-08-30 - Replace Multiple find() with Single Loop in Array Scans
**Learning:** Found multiple `.find()` operations being used sequentially on an array to extract different attributes (like specific coverages within a policy object) inside a loop (`generateCertificate` in `src/services/certificate.service.ts`). Each `.find()` causes a separate O(N) pass over the array and often includes inline string allocations (e.g. `.toLowerCase()`) in the condition, creating significant CPU/memory overhead.
**Action:** When evaluating an array for multiple attributes, replace multiple distinct `.find()` operations with a single `for...of` loop. Pre-compute inline string allocations (like `.toLowerCase()`) once per element within the loop body to reduce redundant O(N) array scans and garbage collection pressure.

## 2026-09-02 - Replace Multiple find() with Single Loop in AL3 Parsing
**Learning:** Found multiple `.find()` operations being used sequentially on an array to extract different attributes (like specific keys from AL3 parsing parts) inside a loop (`parseAl3Content` in `src/services/al3Parser.service.ts`). Each `.find()` causes a separate O(N) pass over the array, creating CPU overhead when processing large payloads.
**Action:** When evaluating an array for multiple attributes, replace multiple distinct `.find()` operations with a single `for...of` loop with inline checks to prevent redundant O(N) array scans and garbage collection pressure.

## 2026-09-08 - Consolidate Multiple Array Reduces
**Learning:** Found multiple `.reduce()` operations being used sequentially on the same array to calculate distinct aggregates (like `totalPremium` and `totalCommission` in `src/services/carrierDownload.service.ts`). Each `.reduce()` causes a separate O(N) pass over the array, creating unnecessary iteration overhead for large datasets.
**Action:** When calculating multiple aggregates over the same array, combine them into a single `for...of` loop to calculate all metrics in one O(N) pass and prevent redundant array iterations.

## 2026-09-03 - Consolidate Multiple find() array scans into a single loop
**Learning:** Found multiple distinct `.find()` lookups operating on the same array to fetch different elements (like fetching 5 separate accounts from `this.accounts` in `getFinancialSummary`). Each `.find()` triggered a separate O(N) array scan, degrading performance to O(5*N).
**Action:** When evaluating an array to find multiple distinct matching elements, replace multiple `.find()` operations with a single `for...of` loop to locate all target elements in one O(N) pass, maintaining `.find()` early-exit behavior by tracking a found count and breaking.

## 2026-09-08 - Avoid DDL inside Transaction Inserts
**Learning:** Executing DDL statements (like `ALTER TABLE`) inside a transactional query path (e.g. `INSERT`) acquires aggressive table-level locks, destroying concurrency and severely degrading performance. In `createJournalEntry`, an inline `ALTER TABLE` was evaluated on every insert.
**Action:** Ensure all schema setup (like adding columns) is restricted to database initialization logic/migrations, not inline within application-level CRUD operations.

## 2026-09-08 - Use Map for O(1) lookups in nested loops
**Learning:** In `createJournalEntry`, an (N 	imes M)$ array scan was caused by calling `.find()` on `this.accounts` inside a loop iterating over `je.lines`. Replacing this with a pre-fetched `Map` of accounts enables (1)$ lookups, reducing the complexity to (N + M)$ safely and without sacrificing type safety.
**Action:** For nested data correlation, pre-fetch the required data into a `Map` for (1)$ lookups to eliminate nested array scans.

## 2024-05-18 - [Combined O(N) Array Scanning in Memory Repository]
**Learning:** The memory repository's `getFinancialSummary` method performed five sequential `.find()` calls to retrieve specific GL accounts. This resulted in O(5N) operations. While small in a prototype context, combining these into a single O(N) `for...of` loop with an early `break` effectively maintains performance consistency.
**Action:** Always combine multiple contiguous `.find()` or `.filter()` calls scanning the same array into a single O(N) loop when retrieving distinct elements. Ensure early exit logic (e.g., `break`) is implemented to maximize performance gains.

## 2026-09-09 - Consolidate chained array operations to prevent intermediate allocations
**Learning:** Sequential `.filter()` calls or `.filter().map()` chains on arrays create wasteful intermediate arrays that consume memory and cause redundant O(N) iterations, causing unnecessary overhead for large datasets (e.g., in `src/services/ams.service.ts` and `src/db/memory.repositories.ts`).
**Action:** Combine chained array operations into a single `for...of` loop or a single `.filter()` pass to calculate the final result in one iteration and prevent wasteful intermediate allocations.

## 2026-09-10 - Eliminate N+1 query loop using pre-fetched Map
**Learning:** In `postJournalEntry` (src/services/accounting.service.ts), iterating through journal line items and performing an awaitable database lookup (`this.getAccountByNumber`) for each line caused a classic N+1 query performance bottleneck. Since memory repos emulate this, it created wasteful loop nesting (M lines * N accounts).
**Action:** Always pre-fetch required datasets completely prior to iterating, and construct an `O(1)` access `Map` object to perform lookups within the iteration. This scales database access down from `O(M)` connections to 1, and time complexity of the local check from `O(N*M)` to `O(N+M)`.

## 2026-09-12 - Preserving Legacy Match Logic in Array Loops
**Learning:** When micro-optimizing array operations by replacing higher-order functions (e.g., `.find()`) with native loops (e.g., `for...of`) to prevent inline closure allocations, "fixing" seemingly flawed edge cases (like `searchName.includes("")` evaluating to true when a property is undefined) can inadvertently break existing integration tests that rely on that exact behavior for reconciliation.
**Action:** Meticulously preserve the exact original boolean logic when doing performance-only refactoring. Do not change business logic or edge case handling unless specifically tasked with fixing a bug.

## 2024-09-16 - Removed severe database bottleneck by eliminating inline DDL execution
**Learning:** Executing DDL statements (like `ALTER TABLE`) during transactional `INSERT` queries is a severe database performance anti-pattern that damages concurrency and locks tables excessively. Schema modifications should be handled during database initialization, not inline within transaction paths.
**Action:** When optimizing database schemas by removing inline `ALTER TABLE` queries that add columns dynamically (e.g., `deactivated_at`, `revoked_at`), always verify that those specific columns are explicitly defined in the initial `CREATE TABLE` definitions within `src/db/schema.sql` to avoid critical schema omissions.

## 2026-09-11 - Resolving Full-Table Fetch N+1 Bottleneck
**Learning:** Fetching an entire database table (e.g., all GL accounts) to memory just to validate a subset of records in a transaction is a severe performance anti-pattern. While it avoids an N+1 query loop, it creates a massive memory payload bottleneck, trading a database connection issue for memory exhaustion.
**Action:** To properly resolve N+1 query loops without incurring full-table fetch memory bottlenecks, use a `Set` to extract the unique identifiers needed from the payload subset, and execute a targeted concurrent fetch using `Promise.all()` or a batched `WHERE IN` query for only those required records, mapping the result for O(1) lookups.

## 2024-05-18 - Consolidate chained array mapping and iteration into single loop
**Learning:** Sequential `.map()` calls followed by `for` loops on arrays create wasteful intermediate arrays that consume memory and cause redundant O(N) iterations. For example, `customerSearchData` in `carrierDownload.service.ts` was being mapped and then immediately iterated over.
**Action:** Combine chained array operations into a single `for...of` loop or a single `.filter()` pass to calculate the final result in one iteration and prevent wasteful intermediate allocations.

## 2025-02-20 - Replace Promise.all with batched query to resolve memory payload bottleneck
**Learning:** Using `Promise.all` with individual DB queries for each item in a payload can lead to connection exhaustion and N+1 query problems. Replacing `Promise.all` over `getAccountByNumber` with a single batched `getAccountsByNumbers` lookup improves performance, avoids limits, and properly resolves the problem without fetching the entire table as an anti-pattern.
**Action:** When correlating multiple nested items or validating lists against a database, use batched lookups (`WHERE id IN (...)` style queries) combined with returning a `Map` or using a single query rather than iterating and firing individual queries concurrently.

## 2026-09-20 - Extract static objects from API route handlers to avoid reallocation overhead
**Learning:** In `src/routes/wsapi.routes.ts`, the `handleValueListGet` endpoint reconstructed a large dictionary (`lists`) containing all supported value list configurations on every single API call. This caused unnecessary memory allocation and garbage collection overhead, particularly under load.
**Action:** To optimize performance and reduce garbage collection overhead in frequently executed functions (like API route handlers), extract static object dictionaries or arrays outside the function scope into module-level constants to prevent them from being reallocated on every request.

## 2026-09-27 - Push array filtering to DB query
**Learning:** When an API route fetches a full table of records and filters them in memory, it creates an O(N) memory bottleneck and wastes DB bandwidth. Modifying the route to pass the filter criteria to the service layer and modifying the repository to execute a targeted `WHERE` query avoids fetching unnecessary rows.
**Action:** Push filtering logic as close to the database as possible using parameterized SQL queries. Ensure all existing filters are still handled when modifying the SQL.

## 2026-09-28 - Accompany Performance Optimizations with Automated Unit Tests
**Learning:** Optimizing query paths or pushing filters to repository/database layers without accompanying unit tests leaves new parameters vulnerable to silent regressions during future refactors.
**Action:** Whenever introducing query optimizations, new repository filter parameters, or loop consolidations, always add corresponding unit test assertions in the relevant test files (e.g., `tests/wsapi.auth.test.ts`, `tests/customer.routes.test.ts`, or service test suites) to lock in the optimized behavior and maintain 100% test coverage.

## 2024-05-18 - PostgreSQL UUID LIKE Filtering
**Learning:** When pushing `policyNumber` string filtering to PostgreSQL repositories using `LIKE` and `LOWER()`, those operations crash if run against a `UUID` type column (like `policy_id`) because `function lower(uuid) does not exist`.
**Action:** Always explicitly cast UUID columns to text in queries before applying string operations, e.g., `LOWER(policy_id::text)`.

## 2026-09-28 - Avoid Blind Assumptions on File Structure due to Output Truncation
**Learning:** When using bash tools like `cat` to read large files in a single session, the output can be silently truncated, leading to incorrect assumptions about the underlying code structure (e.g., assuming `createJournalEntry` instantiates a new `Map` every time).
**Action:** Always retrieve the exact implementation of target methods using targeted commands like `sed -n 'X,Yp'` or `grep -A` before planning or applying code modifications to ensure groundedness and accuracy.

## 2026-09-29 - Surgical Optimization Edits and No Scratch Script Commits
**Learning:** Running whole-file formatters or regenerating entire components while performing performance optimizations introduces massive whitespace/formatting diffs (1,000+ lines), masking the real optimization, invalidating git blame, and causing painful merge conflicts with concurrent PRs. Additionally, committing scratch benchmark or patch scripts (`patch_*.py`, `test.cjs`) pollutes production repositories and triggers CI guardrail failures.
**Action:** Restrict all algorithmic and performance optimizations to strictly scoped replacement chunks. Diff size must reflect only the functional optimization. Always clean up temporary benchmark or patch scripts with `git rm -f` before committing.

## 2026-09-30 - Push lookups to database layer to avoid full table scans
**Learning:** When retrieving a single entity by ID in a service layer (e.g., `getInvoiceById`), fetching the entire collection into memory using `getInvoices()` and performing an O(N) array `.find()` creates a significant memory bottleneck and results in full-table scans at the database layer.
**Action:** Always push ID lookups and filtering down to the repository/database layer by creating specific query methods (e.g., `getInvoiceById`) to enable O(1) indexed database lookups and prevent application memory bloat.

## 2026-10-01 - Avoid Array.map closure allocations on hot paths
**Learning:** Using `Array.prototype.map()` in hot paths (like repository methods returning large database result sets) creates hidden performance overhead due to inline closure allocations and dynamic array resizing.
**Action:** To optimize array mapping on hot-paths (like transforming database result rows), replace `Array.prototype.map()` with a pre-allocated native loop (e.g., `const arr = new Array(length)`) to prevent inline closure allocations and array resizing overhead.

## 2026-10-08 - Push lookup counts to database layer to avoid full table scans
**Learning:** Fetching an entire collection into memory just to determine its length or calculate a next sequence creates a massive memory bottleneck and triggers full-table scans.
**Action:** Always push aggregate functions like count down to the database/repository layer using specific methods (e.g., getInvoiceCount).

## Scope
- **Persona**: Backend Performance & Algorithmic Optimization Engineer (Bolt).
- **Primary Domain**: Algorithmic complexity reduction ($\mathcal{O}(N) \to \mathcal{O}(1)$), memory and GC overhead minimization, and database/repository access pattern optimization (e.g. resolving N+1 queries).
- **Boundaries**: Focus strictly on backend and service-layer performance optimizations. Do not alter UI/UX components or security/cryptography invariants unless explicitly required to unblock a performance bottleneck.

## Operational Constraints
- **Autonomous Execution**: Proceed directly to PR submission once changes are implemented, tests pass, and algorithmic gains are verified. Do not pause to ask for permission.
- **Surgical Edits**: Use targeted replacements only. Avoid whole-file formatting (Prettier, Black) that obscures the core algorithmic optimization and pollutes `git blame`.
- **No Scratch Artifacts**: Do not stage or commit temporary files (`test.cjs`, `benchmark_*.py`). Clean up before committing.
- **Targeted Verification**: Use domain-mapped test fixtures rather than full unconstrained test cascades to prevent CI timeouts.

## Prevention Directives for Automated Refactoring
- **Never Overwrite Complete Files**: Always use range-scoped replacement chunks for edits to `schema.prisma`, `index.ts`, `public/index.php`, `db/schema.rb`, or DDL SQL scripts.
- **Do Not Remove Core Declarations**: Do not delete existing route registrations or database DDL tables.
- **Environment Isolation Compatibility**: When replacing fallback secrets, preserve test environment execution via `!getenv('APP_ENV')` or `getenv('APP_ENV') === 'testing'`.
- **No Scratch Files**: Never stage or commit `test_*.ts`, `test_*.js`, `test.cjs`, `fix_*.php`, or `test.js` files to git.
- **No Unresolved Conflict Markers**: Never stage or commit files containing Git merge conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`, `|||||||`). Always resolve conflicts cleanly before committing.

## Completeness & Verification Directives
- **Explicit Parameter & Contract Validation**: When creating or modifying API endpoints (Express, Fastify, Rails, Laravel), always implement explicit parameter and request body validation schemas (e.g. `z.string().uuid()`) to prevent unhandled 404/500 fallthroughs.
- **Database Indexing for Queries**: When addressing query bottlenecks or adding query lookup filters, always implement native database index migrations rather than loading collections into memory and performing array filtering (`.filter()`, `.select`).
- **Co-Occurring Dependency Auditing**: When bumping any dependency version, verify that other transitive dependencies do not carry high/critical security advisories (e.g. run `bundler-audit`, `npm audit`). Never introduce a version bump that breaks underlying framework APIs.
- **Self-Verification Before Commit**: Always run syntax checks (`bash -n` for shell scripts, `tsc --noEmit` for TypeScript, linter checks) and targeted test runners locally before opening or updating a PR.

## Hallucinatory Task & Empty PR Directives
- **Zero-Diff Task Termination**: If the requested optimization, refactor, or fix is ALREADY natively present in the target branch, DO NOT create an empty pull request or commit an acknowledgment PR. Exit the task cleanly without opening a PR.
- **Stale Suggestion Guard**: Always verify the current code on `main`/`master` before planning changes. If no actionable diff is required, cancel task execution immediately.

## Assertiveness, Decisive PR Execution & Comparative Recommendations
- **Proactive & Decisive PR Submission**: Do NOT repeatedly pause to ask permission to open a pull request (e.g., avoid "Would you like me to open a PR for this?", "Can I submit the PR?", "Should I go ahead and create the PR?"). When an optimization, fix, or feature satisfies requirements, passes local test runners/linters, and preserves architectural invariants, proceed decisively to create and submit the Pull Request with a clear, structured summary and rationale.
- **Explicit Recommendations on Options**: When presenting multiple implementation strategies or architecture options (e.g., Option A vs. Option B), NEVER leave the choice open-ended or passive. Always make an explicit, reasoned recommendation (prefixed with `(Recommended)`) based on **overall technical effectiveness**:
1. *Algorithmic & Complexity Gains*: Time and space complexity impact (O(N*M) -> O(N+M), reduction of nested scans).
2. *Resource Overhead*: Heap allocations, memory pressure, and GC pause reduction.
3. *Domain & Architecture Invariants*: Strict backward compatibility, contract stability, and prevention of regression risks.
4. *Security & Reliability*: Input validation, cryptographic safety, and concurrency safety.
- **Lead with Recommended Path**: State clearly why the recommended solution delivers the highest net value and immediately execute or propose it as the primary course of action rather than asking open-ended questions.

## Scope Verification, Minimal Churn & CI Protection Directives
- **Scope Verification Before Variable Binding**: When adding interactive states or accessibility attributes (e.g. `disabled={loading}`, `aria-busy={loading}`, `isSubmitting`), NEVER assume a variable identifier exists. Always inspect component props, local state hooks (`useState`), or declaration scope first. If not defined, declare the state hook or reuse an existing scope variable. Never introduce TS2304 / TS2552 ("Cannot find name") compile errors.
- **Surgical Edits Only (No Whole-File Formatting)**: Never run whole-file code formatters (Prettier, Black, Pint, rustfmt) across unmodified lines. Changes must be strictly range-scoped and limited to the minimal AST block needed. Avoid noisy quote/whitespace churn that masks real logic changes and causes merge conflicts. Verify with `git diff -w` that non-functional churn is zero.
- **Zero Scratch File Commits**: Never stage or commit ad-hoc verification, patch, or debug scripts (`test.cjs`, `fix_*.cjs`, `fix_*.php`, `patch_*.py`, `patch_*.sh`, `scratch_*`). Execute checks via the project's native test commands (`npm test`, `pytest`, `phpunit`, etc.) and delete temporary scripts before creating git commits.
- **Never Weaken CI Workflows**: Do not modify `.github/workflows/**` to bypass failures (e.g. adding `|| true`, setting `continue-on-error: true`, or commenting out assertions). Always resolve the defect in the source code or test fixture.
- **Explicit Parameter & Variable Types**: In TypeScript files, avoid implicit `any` by always providing explicit types on functions, parameters, and arrow callbacks (e.g. `(id: string) => ...`). Verify zero type errors with `tsc --noEmit` before committing.
- **Multi-Tenant Scoping in Repository Lookups**: When pushing entity lookups from service layers down to repository methods (`getById`), always accept `tenantId: string` and enforce tenant boundaries (`WHERE tenant_id = $1` in SQL, or `(!i.tenantId || i.tenantId === tenantId)` in memory repositories) to prevent accidental cross-tenant data leakage.
- **Mandatory Journaling**: Every functional PR MUST append an entry to `.jules/bolt.md` documenting the Learning and Action before committing.

## Additive Documentation & Scratch Cleanliness Directives
- **Strictly Additive Journal Updates**: When updating `.jules/*.md`, strictly append new dated entries (`## YYYY-MM-DD - Title`). NEVER delete, truncate, or overwrite historical learnings or previous entries.
- **Substantive Code Diff Requirement**: Pull requests must include substantive code changes in `src/`, `app/`, `lib/`, or `tests/`. Never open PRs that modify only `.jules/*.md` journals or root scratch scripts.
- **Zero Scratch File Commits**: Never commit `*.diff`, `*.patch`, `test_*.ts`, `test_*.js`, `test.cjs`, `fix_*.php`, or `patch_*.py` files. Always remove temporary debugging or verification scripts prior to committing.

## Scope Quarantine, Journaling & Security Test Invariants
- **Strictly Append-Only Journaling**: When adding learnings to `.jules/*.md`, append strictly at the end of the file. Do not rewrite, deduplicate, or remove lines beginning with `## YYYY-MM-DD`.
- **Surgical Scope Quarantine**: Modify only the files directly involved in the issue and their corresponding test fixtures. Do not delete, rename, or perform drive-by cleanups of unrelated root-level scripts or legacy files.
- **Coupled Test Fixture Awareness for Security Invariants**: When changing fail-open fallback behavior (such as hardening decryption to fail closed), always update upstream test mocks that rely on plaintext credentials or mock values.

## 2026-10-09 - Replaced full-table fetch with direct ID lookup for Carrier in AmsService
**Learning:** In \generateDecPage\, the code was previously fetching the entire carriers table into memory and performing an O(N) array \.find()\ scan to retrieve a single carrier by ID, creating a performance bottleneck and memory bloat.
**Action:** When a method needs to resolve a single relational entity (like a \carrierId\ associated with a \policy\), always check if a direct \getById\ method exists on the repository and use it to perform an O(1) query instead of fetching the entire dataset.

- **Strict Lowercase Directory Casing**: Always write learning notes to lowercase `.jules/<bot>.md`. Never create, commit, or reference uppercase `.Jules/`.

- **Clean Markdown Formatting**: Always append journal entries using actual newline characters, never literal string escape sequences `\n`.
