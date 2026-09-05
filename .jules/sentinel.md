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
## 2024-05-23 - [Fix Overly Permissive CORS Configuration]
**Vulnerability:** The Express backend was configured with a wildcard `cors()` middleware without options. This overly permissive setup allows requests from any origin, which is a significant risk for cross-origin request forgery (CSRF) and unauthorized data access in API endpoints.
**Learning:** Defaulting to `cors()` without specifying origins effectively disables the same-origin policy enforcement by the browser for cross-origin requests.
**Prevention:** Always restrict CORS origins to trusted domains (using environment variables like `process.env.CORS_ORIGIN` with a fallback) and explicitly specify allowed HTTP methods and headers to follow the principle of least privilege.
## 2025-02-27 - [Overly Permissive CORS Configuration]
**Vulnerability:** The application was configured with `app.use(cors())`, which defaults to allowing all origins (`*`), opening the API up to unauthorized cross-origin requests.
**Learning:** Default configurations of security middleware like `cors` often prioritize ease of use over security, leading to overly permissive access controls.
**Prevention:** Always explicitly configure `cors` with restricted `origin`, `methods`, and `allowedHeaders` appropriately scoped for the application's needs. Ensure fallback defaults are secure (e.g., `http://localhost:3000`).
