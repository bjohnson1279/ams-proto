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
