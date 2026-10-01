# Agent Directives & Operational Scope

## Scope
- **Persona**: Frontend UI, Accessibility, and User Experience Engineer (Palette).
- **Primary Domain**: React components, vanilla DOM accessibility, ARIA role management, interactive empty states, and WCAG compliance.
- **Boundaries**: Focus on client-side rendering, accessibility, and user interaction. Do not modify backend database schema, API routing, or server-side security middleware unless required to support a UI feature.

## Operational Constraints
- **Autonomous Execution**: Proceed directly to PR submission once changes are implemented, DOM assertions pass, and accessibility invariants are met. Do not pause to ask for permission.
- **Surgical Edits**: Use targeted replacements only. Avoid whole-file formatting that obscures the core accessibility/UX improvements.
- **No Scratch Artifacts**: Do not stage or commit temporary DOM test scripts (`test_ui.js`). Clean up before committing.
- **Scope Verification**: Always verify variables (like `loading` state) exist in the component scope before binding them to attributes (like `disabled` or `aria-busy`).

## 2024-05-18 - Modal Dialog Accessibility and Usability
**Learning:** Adding `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` ensures screen readers understand standard UI elements correctly. Closing a modal with the Escape key is a baseline usability pattern that users expect, especially keyboard-only users navigating the interface.
**Action:** Always add keyboard handlers (like Escape to close) and explicit ARIA roles/labels when creating or modifying custom modals to prevent them from becoming accessibility traps.

## 2024-08-18 - Aria-Live for Asynchronous Status Updates
**Learning:** Dynamically updating text on the screen (like a status badge or completion message after a dry-run audit) is completely invisible to screen readers unless the container has an `aria-live` attribute.
**Action:** Always add `aria-live="polite"` (or "assertive" if critical) to status elements that are updated asynchronously via JavaScript to ensure parity between visual and auditory experiences.

## 2024-10-24 - Empty States for Dynamic Search Results
**Learning:** When tables are dynamically filtered (like via a search input), users need immediate, clear visual feedback if their search yields zero results. An empty table body can appear broken or lead the user to believe the data is still loading.
**Action:** Always provide an explicit "empty state" row spanning all table columns with a helpful message and guidance (e.g., "Try adjusting your search criteria") when data arrays are empty.

## 2026-08-21 - Tab Navigation Accessibility
**Learning:** Custom tabbed interfaces require explicit ARIA roles (`tablist`, `tab`, `tabpanel`) and dynamic `aria-selected` attributes for screen readers to understand the structure and active state.
**Action:** Always add standard ARIA tab roles and manage state programmatically when building custom tab components.

## 2024-11-20 - Contextual ARIA Labels on Repeated Action Buttons
**Learning:** Tables displaying dynamic data (like Customers or Carrier Downloads) often have repeated action buttons (e.g., "View Dec-Page", "Post GL Comm"). For screen reader users, hearing these generic labels consecutively without context is confusing. Adding specific context (e.g., `aria-label="View Dec-Page for Customer CUST-1001"`) drastically improves usability. Furthermore, when writing these labels in dynamic template literals, it is crucial to use explicitly available properties on the iterated object (like `c.customerId`) instead of relying on variables constructed elsewhere in the template to ensure correctness and prevent runtime reference errors.
**Action:** Always add specific, context-aware `aria-label`s to repeated action buttons and textareas. When working within dynamic HTML templates, ensure you reference properties that are guaranteed to exist within that scope.

## 2026-09-08 - Actionable Empty States in Data Tables
**Learning:** Empty tables can make users feel stuck if there's no clear path forward. Providing a descriptive empty state with an actionable call-to-action button (like "+ Import" or "Execute Reconciliation") improves user onboarding and guides them to the right workflow.
**Action:** When rendering data tables, always include an empty state branch with an actionable button when datasets are empty.

## 2024-08-30 - [Consistent Async Button Loading States]
**Learning:** Vanilla JS implementation of disabled states and loading text replacement is effective but verbose, requiring robust `try/finally` blocks and event targeting to prevent permanently disabled buttons on fetch failures.
**Action:** When adding async button loading states, ensure that prompt/dialog interruptions cancel out *before* the UI state changes, and always use `finally` to restore the button reference securely.

## 2024-10-25 - [Actionable Empty States in Vanilla JS Data Tables]
**Learning:** When datasets are empty, leaving the table blank causes user confusion. Injecting an actionable empty state (with a clear message and a primary call-to-action button mapped to the creation modal) directly into the rendering container's `innerHTML` by returning early prevents rendering errors and significantly improves discoverability.
**Action:** Always implement empty states with an actionable CTA button for data tables that can be empty, utilizing existing design system classes (e.g., `btn`, `btn-primary`) rather than introducing inline styles to adhere to strict framework boundaries.

## 2024-11-20 - [Sequential Empty States for Multi-Table Fetches]
**Learning:** When a single function (like `fetchAccountingData`) fetches and populates multiple tables sequentially, returning early after rendering the first empty state prevents subsequent tables from rendering correctly (either with data or their own empty state).
**Action:** Use an `if/else` block for each dataset within the sequential process instead of early returns to ensure all tables are processed independently and their respective empty states or data populate as intended.

## 2024-11-20 - [Dynamic Search Results Accessibility]
**Learning:** Adding `aria-live="polite"` to empty states for dynamic search results ensures that screen readers are notified of updates.
**Action:** When creating dynamic search results, always add `aria-live="polite"` to the empty state container to improve accessibility.

## 2024-11-22 - [Modal Focus Management]
**Learning:** When a modal opens, keyboard focus must move into the modal (e.g., to the close button or first input). If focus remains outside the modal, keyboard-only and screen reader users lose context and may interact with elements hidden behind the modal backdrop. Furthermore, when the modal closes, focus must be programmatically returned to the button that originally triggered it to maintain the user's place in the document flow.
**Action:** Always implement focus management when creating custom modals: store `document.activeElement` before opening, shift focus into the modal once active, and restore focus to the stored element upon closing.

## 2024-11-20 - Format Pill Tab Accessibility
**Learning:** Elements styled as interactive "pills" that control content (like selecting a payload format to display in an editor) functionally act as tabs. Without explicit ARIA tab roles (`tablist`, `tab`, `tabpanel`) and dynamic `aria-selected` toggling, screen readers treat them as generic buttons without semantic grouping, leading to poor discoverability of their relationship to the controlled content.
**Action:** Always add standard ARIA tab roles (`role="tablist"`, `role="tab"`) and programmatically manage `aria-selected` and `aria-controls` states when building custom tab-like interactions, regardless of their visual styling (e.g., pills).

## 2025-01-20 - Visual Shortcut Indicators vs Placeholder Text
**Learning:** Embedding keyboard shortcut hints directly into input placeholder text (e.g., "... (Press '/')") clutters the hint and increases cognitive load, especially when the placeholder text is long or truncated. Using a dedicated visual `<kbd>` element separated from the placeholder text provides a clearer, modern UX pattern for discoverability without sacrificing input space.
**Action:** Always use dedicated `<kbd>` styled elements for global shortcut hints next to inputs rather than embedding instructions directly in the placeholder string. Add `aria-hidden="true"` to prevent redundant screen reader announcements if the hint is visual only.

## 2025-02-27 - Textarea Placeholders as Empty States
**Learning:** When textareas are used as raw input editors and the user clears the default content, the lack of placeholder text creates a stark, confusing empty state without guidance on what format is expected.
**Action:** Always provide descriptive `placeholder` text on input textareas to guide users when the field is empty, serving as an inline empty state.

## 2024-06-30 - Dynamic empty states need aria-live
**Learning:** When creating or updating dynamic UI elements like search result tables, list views, or status containers that toggle empty states via JavaScript, screen readers won't announce when content appears or disappears unless wrapped in an element with `aria-live="polite"` and `role="status"`.
**Action:** Ensure empty state container elements or dynamic results wrappers include `aria-live="polite"` and `role="status"` so assistive tech announces dynamic DOM changes.

## 2026-09-18 - Tabpanel on Native Inputs
**Learning:** According to W3C ARIA specifications, assigning a structural widget role like `role="tabpanel"` directly to an interactive input element (like a `<textarea>` or `<input>`) overrides its native implicit role (e.g., `textbox`). Screen readers will no longer announce it as an input field, creating a severe accessibility trap where users don't know they can type into it.
**Action:** Never apply `role="tabpanel"` directly to interactive inputs. Instead, wrap the input in a generic structural element (like a `<div>`) and apply the `tabpanel` role to that wrapper container.

## 2024-11-23 - Persistent Screen Reader Announcers vs InnerHTML
**Learning:** Injecting elements with `aria-live` (like `aria-live="polite"`) into the DOM via `innerHTML` is an accessibility anti-pattern. Screen readers often miss these dynamic insertions because the element did not exist when the DOM was parsed, or because the insertion event fires inconsistently across different browsers and assistive technologies.
**Action:** Never inject `aria-live` elements dynamically via `innerHTML`. Always use a persistent, visually hidden (`.sr-only`) DOM element with `aria-live` attached in the static HTML, and update its text content dynamically via JavaScript when announcements are needed.

## 2024-11-20 - [Redundant aria-labels on labeled inputs]
**Learning:** When an interactive element (like a `<select>` or `<input>`) already has a correctly linked visible `<label>` (using the `for` attribute), adding an `aria-label` attribute is an accessibility anti-pattern because the `aria-label` will completely override the visible label for screen readers.
**Action:** Do not add redundant `aria-label` attributes to form controls that already have valid, programmatically associated visible labels.

## 2024-10-24 - Implementing Skip Links Safely
**Learning:** Adding a "skip to main content" link requires setting `tabindex="-1"` on the target container (e.g., `<main>`) to ensure it can receive programmatic focus when the link is clicked. Without it, the browser scrolls but doesn't move focus, meaning the next Tab press will start from the top again.
**Action:** Always ensure target elements for skip links have `tabindex="-1"`. Also, when using tools like `pnpm add` to install temporary testing dependencies (like Playwright), be incredibly careful to revert any unintended changes to lockfiles (`pnpm-lock.yaml`) to prevent accidental major version bumps of backend dependencies (like Express v5).
## 2024-05-30 - Improve live search UX and screen reader updates
**Learning:** `onkeyup` fails to capture text pasted via mouse, drag-and-drop, or autofilled by the browser. Additionally, only announcing empty states to screen readers leaves visually impaired users unaware when actual results populate the screen. Shortcut hints (like `<kbd>`) visually overlap user text if they aren't hidden dynamically.
**Action:** Use `oninput` for real-time text fields to catch all mutations. Ensure dynamic screen reader updates announce both empty states and successful data loads (e.g. `announceToScreenReader('Found X items')`). Hide visual decorators inside inputs when text is present.

## 2026-09-28 - Accompany UX & Accessibility Changes with Automated DOM Tests
**Learning:** Adding accessibility improvements (such as `announceToScreenReader`, ARIA attributes, or real-time event listeners like `oninput`) without DOM test assertions allows future UI redesigns to accidentally strip them away.
**Action:** Whenever enhancing UI accessibility or interactive inputs, always add or augment assertions in the UI guardrail test suite (e.g., `tests/ui.empty-states.test.ts`) to verify that the required event handlers, ARIA states, and announcement hooks remain present in the DOM.


## 2026-09-28 - ARIA Busy vs Title on Async Action Buttons
**Learning:** Adding `title` attributes to disabled buttons that already change their visible text to "Loading..." is redundant and discouraged for accessibility. The correct, standard ARIA pattern for signaling that a UI element is processing without redundant textual tooltips is to use `aria-busy="true"`.
**Action:** When creating async button loading states, use `aria-busy="true"` on the button instead of injecting a temporary `title`, and ensure it is cleaned up using `removeAttribute('aria-busy')` in the finally block.

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
- **WAI-ARIA Dynamic Loading States**: Use `btn.setAttribute("aria-busy", "true")` instead of `btn.title = "Processing..."` on buttons undergoing asynchronous tasks, and remove `aria-busy` in `finally` blocks. Tooltip title attributes interfere with screen reader announcements and fail WCAG 4.1.2. Always execute `node --experimental-vm-modules node_modules/jest/bin/jest.js tests/ui.empty-states.test.ts` when modifying `public/index.html`.
- **Mandatory Journaling**: Every functional PR MUST append an entry to `.jules/palette.md` documenting the Learning and Action before committing.

## 2026-09-29 - Scope Verification for Async Loading Attributes
**Learning:** Blindly injecting `disabled={loading}` or `aria-busy={loading}` into JSX/TSX buttons causes fatal TypeScript compilation errors (`TS2304: Cannot find name 'loading'`) when `loading` is not declared in component props, state hooks (`useState`), or mutation results. Furthermore, using temporary patch scripts (`fix_*.cjs`) to manipulate source code pollutes the git index.
**Action:** Before referencing any state identifier (such as `loading`, `isSubmitting`, `isPending`) in `disabled` or `aria-busy`, inspect the component scope. If no loading state is tracked, define it using `useState(false)` or check existing query/mutation hooks. Never bind undeclared variables. Always run `tsc --noEmit` locally and never commit temporary fix scripts.

## 2026-09-30 - Fix redundant titles during async loading with aria-busy
**Learning:** Setting `btn.title = 'Processing...'` or other status strings during async button execution creates redundant, disruptive browser tooltips that collide with assistive technologies and does not programmatically announce the loading state.
**Action:** Replace `btn.title` overrides with `btn.setAttribute("aria-busy", "true")` and ensure cleanup via `btn.removeAttribute("aria-busy")` in `finally` blocks to adhere strictly to WCAG 4.1.2.

## 2026-11-23 - Leverage Native Search Input Type
**Learning:** For single-field text filters (like "Search customers"), using a generic `type="text"` requires writing custom JavaScript and HTML elements to provide a "clear" (x) button. Changing the input type to `type="search"` automatically provides a native, zero-configuration clear button in WebKit/Blink browsers without any extra code or JavaScript overhead.
**Action:** When implementing simple search fields, always leverage `type="search"` instead of `type="text"` to immediately inherit native UX functionality and reduce custom code maintenance.
