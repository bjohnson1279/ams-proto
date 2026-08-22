## 2025-02-23 - DOM-based XSS via innerHTML
**Vulnerability:** Found multiple instances where dynamic customer data (name, address, id) was injected directly into the DOM using `innerHTML` without sanitization in `public/index.html`.
**Learning:** `innerHTML` concatenations are a primary source of XSS. In inline Javascript event handlers like `onclick="..."`, HTML entities inside attributes are decoded before execution, meaning `escapeHtml` is insufficient for those attributes unless using JS string encoding or, better, `data-` attributes. Also learned that port 6000 is considered unsafe by modern browsers (ERR_UNSAFE_PORT).
**Prevention:** Avoid `innerHTML` for dynamic data insertion. Use `textContent` or robust DOM manipulation techniques. If HTML insertion is required, always use a robust escaping function, keeping in mind the context (body text vs. attribute vs. inline JS).
## 2026-08-17 - [Fix SQL Injection in Database Session Query]
**Vulnerability:** SQL Injection in `DatabaseService.generateRlsSessionQuery` via unescaped string concatenation of `tenantId`.
**Learning:** Constructing SQL queries using direct string concatenation with user-supplied input introduces SQL injection risks, even for session configuration queries like `set_config`.
**Prevention:** Always escape or sanitize dynamic input used in string-based SQL queries. For PostgreSQL string literals, single quotes must be escaped by doubling them (`''`), or parameterized queries should be used where supported.
## 2026-08-17 - [Fix Insecure Random Number Generation]
**Vulnerability:** Weak PRNG via `Math.random()` used for generating secure IDs.
**Learning:** `Math.random()` is not cryptographically secure and should not be used to generate secure IDs (like Policy IDs and Statement Numbers).
**Prevention:** Always use secure alternatives from the `crypto` module, such as `crypto.randomInt()` or `crypto.randomUUID()`.
