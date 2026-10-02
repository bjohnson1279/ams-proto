# Agent Directives & Operational Scope

## Scope
- **Persona**: Application Security, Cryptography, and Invariant Hardening Engineer (Sentinel).
- **Primary Domain**: Security invariant preservation, CORS/middleware hardening, cryptographic identifier generation, SQL injection prevention, and HTTP response sanitization.
- **Boundaries**: Focus strictly on defense-in-depth, access control, and data sanitization. Do not engage in UI redesigns or deep algorithmic optimizations unless directly tied to a vulnerability.

## Operational Constraints
- **Autonomous Execution**: Proceed directly to PR submission once vulnerabilities are patched, security tests pass, and no CI guardrails are weakened. Do not pause to ask for permission.
- **Surgical Edits**: Use targeted replacements only. Avoid whole-file formatting that obscures the core security patches and causes merge conflicts.
- **No Scratch Artifacts**: Do not stage or commit temporary exploit/verification scripts. Clean up before committing.
- **Fail-Safe Defaults**: Always implement explicit allow-lists and fail-safe defaults when hardening configurations (e.g., CORS origins, error stack traces).

## 2024-05-18 - [Fix DOM-based XSS in public/index.html innerHTML insertions]
**Vulnerability:** Numerous properties populated via nested fields or formatting functions were placed unescaped into innerHTML templates directly (e.g., `p.policy.premiumAmount`, `a.debitBalance.toLocaleString()`). Also, `.toString()` was being used inside `escapeHtml()` which crashed the frontend if the variable was null/undefined.
**Learning:** `escapeHtml` does not crash on null/undefined and casts to strings appropriately, so `.toString()` is not necessary and leads to vulnerabilities in vanilla UI. Furthermore, all mathematical/formatted numeric fields coming from the backend must be escaped before being rendered via `innerHTML`.
**Prevention:** Avoid `.toString()` within `escapeHtml`. Always wrap ALL dynamic values in string template literals assigned to `.innerHTML` in `escapeHtml()`, even if they are integers, floats, or result from `.toLocaleString()`.

## 2024-05-19 - [Fix DOM-based XSS in public/index.html innerHTML insertions]
**Vulnerability:** Numeric properties and formatted outputs like `.toLocaleString()` were placed unescaped into innerHTML templates directly (e.g., `inv.grossPremium.toLocaleString()`, `b.totalTransactions`). Although they are typically numeric, treating them as safe without sanitization violates strict DOM-based XSS prevention constraints.
**Learning:** All mathematical/formatted numeric fields coming from the backend or processed client-side must be escaped before being rendered via `innerHTML`. Trusting the type structure is not a substitute for explicit sanitization boundaries.
**Prevention:** Always wrap ALL dynamic values in string template literals assigned to `.innerHTML` in `escapeHtml()`, even if they are integers, floats, or result from `.toLocaleString()`.

## 2024-05-20 - [Fix error handling info leak in Express controllers]
**Vulnerability:** The `DownloadController` caught exceptions in a `try...catch` block and returned the raw `err.message` in 500 responses (`res.status(500).json({ error: err.message })`), which can expose sensitive internal system details to API clients.
**Learning:** Returning raw error messages directly to clients circumvents the global error handler, potentially leaking stack traces or internal mechanics (e.g. database schema details or file paths).
**Prevention:** In Express controllers, always pass caught errors to the `next()` middleware (e.g., `next(err)`) instead of returning raw `err.message` in 500 responses. This ensures errors are handled centrally, where details can be sanitized for production environments.

## 2024-05-21 - [Prevent stack trace leakage in fail-open configuration]
**Vulnerability:** The global error handler in `src/middleware/errorHandler.ts` was modified to expose the stack trace for all environments *except* 'production' (`stack: isProduction ? undefined : err.stack`). This fail-open approach risks leaking sensitive stack trace details if `NODE_ENV` is unset, misspelled (e.g., 'prod'), or set to a non-production intermediate environment.
**Learning:** Security controls related to information exposure must default to deny (fail-safe). Stack traces should only be exposed when an environment is explicitly recognized as safe for debugging (e.g., 'development').
**Prevention:** Always use an allow-list approach for exposing sensitive debugging information. Restore the condition to `process.env.NODE_ENV === 'development' ? err.stack : undefined` to ensure stack traces are safely hidden by default.

## 2024-05-22 - [Preserve observability while sanitizing error messages]
**Vulnerability:** Sanitizing `err.message` in the global error handler *before* logging it to the console (or external logging service) masks the true underlying error from developers, severely degrading production observability.
**Learning:** While it is critical to sanitize the error payload sent in the HTTP response to the client, the original error object must remain intact when passed to logging functions to ensure developers can diagnose issues.
**Prevention:** Perform sanitization logic only on the variables passed into the `res.json()` payload construction, and ensure `console.error(..., err)` happens with the original, unmodified error object.

## 2024-05-23 - [Fix overly permissive CORS configuration]
**Vulnerability:** The application was configured with `app.use(cors())` which by default allows cross-origin requests from any origin (`*`), leading to potential unwanted data exposure or CSRF-like risks.
**Learning:** Default configuration for security middlewares like `cors` is often overly permissive for real-world applications. Express's default `cors()` without options allows all origins, which should be explicitly constrained.
**Prevention:** Always define an explicit options object for `cors()` specifying an allowlist of allowed origins (e.g., pulling from environment variables like `CORS_ORIGIN` with a safe local fallback), alongside restricted HTTP methods and allowed headers to enforce the principle of least privilege.

## 2025-02-27 - [Overly Permissive CORS Configuration]
**Vulnerability:** The application was configured with `app.use(cors())`, which defaults to allowing all origins (`*`), opening the API up to unauthorized cross-origin requests.
**Learning:** Default configurations of security middleware like `cors` often prioritize ease of use over security, leading to overly permissive access controls.
**Prevention:** Always explicitly configure `cors` with restricted `origin`, `methods`, and `allowedHeaders` appropriately scoped for the application's needs. Ensure fallback defaults are secure (e.g., `http://localhost:3000`).

## 2024-03-24 - [Insecure Random ID Generation]
**Vulnerability:** Weak random number generation (`Math.random()`) used for creating Certificate Holder IDs (`HOLDER-<id>`).
**Learning:** `Math.random()` is predictable and not cryptographically secure, leading to potential Insecure Direct Object Reference (IDOR) vulnerabilities if used for token generation or object identifiers.
**Prevention:** Use Node.js's native `crypto` module (e.g., `randomInt()`) to generate cryptographically secure random values.

## 2024-03-25 - [Missing Strict Rate Limiting on Authentication Endpoints]
**Vulnerability:** The WSAPI `Login` and `ValidateAgentLogin` endpoints were not explicitly rate-limited, relying only on the generic API rate limiter. This left them vulnerable to brute-force and credential-stuffing attacks.
**Learning:** Global rate limits are often too permissive for authentication endpoints, which require much stricter limits to effectively deter automated attacks.
**Prevention:** Implement specific, strict rate limiters (e.g., 5 requests per 15 minutes) for all endpoints that handle authentication or credential validation.

## 2024-05-24 - [Fix Hardcoded Tenant ID Authorization Bypass]
**Vulnerability:** In `src/routes/wsapi.routes.ts`, multi-tenant API routes (like `CustomerGet`, `CustomerInsert`, `CustomerUpdate`, `PolicyGet`) used a hardcoded fallback tenant ID (`'tenant-001'`) instead of strictly requiring and extracting the `tenantId` from the authenticated user's session ticket.
**Learning:** Hardcoding or falling back to a specific tenant ID in a multi-tenant system defeats the purpose of logical data isolation. If session validation logic is flawed or missing, the system defaults to allowing unauthorized access to the fallback tenant's data, causing a severe data leak and manipulation risk.
**Prevention:** When implementing multi-tenant API routes (e.g., WSAPI endpoints), never use a hardcoded fallback tenant ID if the session's tenant ID is missing. Always fail securely (e.g., return an 'INVALID_TICKET' fault) to prevent cross-tenant authorization bypass.

## 2024-05-25 - [SQL Injection Risk via Manual String Sanitization]
**Vulnerability:** The `generateRlsSessionQuery` method in `src/services/database.service.ts` constructed a Row-Level Security (RLS) SQL query via string concatenation, using a basic `replace(/'/g, "''")` to escape single quotes.
**Learning:** Manual string sanitization is fragile and error-prone, leaving systems vulnerable to SQL injection (e.g., if backslashes are involved). Even if the query is only setting session configuration variables (`set_config`), building raw SQL strings dynamically with user or external input is a severe security anti-pattern.
**Prevention:** Always use parameterized queries for all database interactions. Instead of returning a raw string to be executed, return a query object (e.g., `{ text: string, values: string[] }`) and pass the parameterized values securely to the database driver.

## 2026-09-22 - [Sanitize error messages in controller responses]
**Vulnerability:** Express controllers in the system (e.g., accounting, certificate, and policy controllers) returned raw `err.message` values directly to the client in HTTP 400 and 404 responses. This could potentially leak internal system mechanics, database errors, or file paths.
**Learning:** While global error handlers are designed to catch and sanitize unhandled 500 errors, localized 400/404 responses in controller `catch` blocks must also be explicitly sanitized to prevent information exposure. However, blindly replacing these responses with `next(err)` can sometimes mask the HTTP status code intent or cause unhandled rejections if not structured perfectly with the global handler.
**Prevention:** When preventing information leakage (e.g., exposing `err.message`) in Express `catch` blocks, sanitize the response dynamically based on the environment (e.g., `process.env.NODE_ENV === 'production' ? 'Generic Error' : err.message`). This secures production environments from leaking sensitive information while preserving full context for developers during debugging.

## 2026-09-28 - Accompany Security Hardening with Automated Regression Tests
**Learning:** Hardening error handlers or sanitizing responses without automated test assertions can lead to unintentional regressions where sensitive traces are leaked again in future updates.
**Prevention:** Whenever sanitizing error messages or hardening endpoints against information leakage or XSS, always add automated test assertions verifying that production environments (`NODE_ENV=production`) correctly conceal internal exception details while test/dev modes preserve necessary debugging context.

## 2026-09-22 - [Insecure Random ID Generation via Date.now()]
**Vulnerability:** The application used `Date.now()` to generate unique identifiers (e.g., `policyId`, `batchId`, `entryId`) across several services and transformers.
**Learning:** `Date.now()` is highly predictable and not cryptographically secure, leading to potential Insecure Direct Object Reference (IDOR) vulnerabilities or identifier collisions if used for token generation or object identifiers.
**Prevention:** Use Node.js's native `crypto` module (e.g., `randomUUID()` or `randomInt()`) to generate cryptographically secure random values.

## 2024-06-25 - Secure CORS Configuration
**Vulnerability:** The Express CORS middleware (`cors()`) was configured to only specify the allowed `origin`, leaving HTTP methods and allowed headers overly permissive. This could allow unintended cross-origin interactions.
**Learning:** Default permissive configurations in libraries like `cors` violate the principle of least privilege. Explicitly defining allowed parameters narrows the attack surface.
**Prevention:** Always define an explicit options object for `cors()` specifying `allowedOrigins`, `methods`, and `allowedHeaders`.

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
- **No Journal-Only PRs**: Never open a pull request that only contains updates to .jules/*.md files without corresponding functional code changes and tests.
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
- **Cryptographically Secure UUID Generation**: Never use `Date.now()`, `Math.random()`, or predictable timestamps when generating entity IDs or fallback identifiers (such as policy numbers or customer IDs in legacy data transformers). Always import `{ randomUUID }` from Node `crypto`.
- **Mandatory Journaling**: Every functional PR MUST append an entry to `.jules/sentinel.md` documenting the Learning and Action before committing.


## 2026-09-30 - Replace Date.now() with cryptographically secure randomUUID()
**Learning:** Using `Date.now()` to construct fallback policy numbers (e.g. `FMT-B-${Date.now()}` or `FMT-C-${Date.now()}`) in legacy payload transformers causes ID collisions when batch records are processed in the same millisecond, and exposes predictable identifiers.
**Action:** Replace `Date.now()` with Node's native `randomUUID()` from `crypto` to guarantee non-predictability and eliminate race-condition collisions during concurrent data migrations.

## 2026-09-29 - Non-Destructive Security Patching & CI Protection
**Learning:** Security patches must never weaken CI workflow files (`.github/workflows/**`) by appending `|| true` or `continue-on-error: true` to suppress test/build failures. Furthermore, when adding defensive type assertions or input validators in TypeScript, omitting explicit types can introduce `TS7006: Parameter implicitly has an 'any' type`.
**Action:** Never modify CI workflow definitions to bypass test failures; resolve the underlying issue in source code or test fixtures. Always provide explicit types on newly introduced parameters and helper functions. Ensure zero scratch scripts (`fix_*.php`, `test_*.js`) are committed.

## 2024-10-02 - Ensure Template Strings for Text Insertion Do Not Need HTML Escaping
**Learning:** Using `escapeHtml()` in raw text contexts, like `alert()` template strings or browser native popups, breaks functionality and degrades user experience by displaying raw HTML entities (`&amp;`, `&lt;`) where they aren't parsed by the DOM.
**Action:** When mitigating XSS by adding `escapeHtml()`, explicitly verify the context. Only escape inputs going directly into HTML nodes (e.g., `innerHTML`). Never apply HTML escaping to plaintext contexts like JavaScript `alert()`, `console.log`, or native prompt functions.

## 2024-10-02 - Validate Numeric Values to Prevent Accounting Arbitrary Manipulation
**Learning:** Functions that accept parameters directly mapping to financial or calculation formulas (like `commissionRate` when creating an invoice) can be manipulated if the server does not enforce strong boundary checks, leading to absurd negative commissions or payouts exceeding 100%.
**Action:** Always validate and bound incoming calculation variables. Explicitly parse inputs to floats/integers, ensure they are not `NaN`, and enforce business logic boundaries (e.g., `0 <= rate <= 100`) before proceeding to the service layer.
