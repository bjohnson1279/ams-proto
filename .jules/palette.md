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
