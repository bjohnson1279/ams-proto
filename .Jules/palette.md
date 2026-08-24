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

## 2024-11-21 - Visual Feedback for Asynchronous Actions
**Learning:** For asynchronous API calls (e.g., parsing, ingesting, posting), providing immediate visual feedback by updating the button text to a loading state and disabling it prevents duplicate interactions and improves the user experience.
**Action:** When implementing asynchronous operations triggered by buttons, always disable the button and show a loading indicator, then ensure it is re-enabled and its original state is restored in a `finally` block to handle both success and error cases reliably.
