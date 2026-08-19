## 2024-05-18 - Modal Dialog Accessibility and Usability
**Learning:** Adding `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` ensures screen readers understand standard UI elements correctly. Closing a modal with the Escape key is a baseline usability pattern that users expect, especially keyboard-only users navigating the interface.
**Action:** Always add keyboard handlers (like Escape to close) and explicit ARIA roles/labels when creating or modifying custom modals to prevent them from becoming accessibility traps.

## 2024-08-18 - Aria-Live for Asynchronous Status Updates
**Learning:** Dynamically updating text on the screen (like a status badge or completion message after a dry-run audit) is completely invisible to screen readers unless the container has an `aria-live` attribute.
**Action:** Always add `aria-live="polite"` (or "assertive" if critical) to status elements that are updated asynchronously via JavaScript to ensure parity between visual and auditory experiences.