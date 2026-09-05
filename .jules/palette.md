## 2024-08-30 - [Consistent Async Button Loading States]
**Learning:** Vanilla JS implementation of disabled states and loading text replacement is effective but verbose, requiring robust `try/finally` blocks and event targeting to prevent permanently disabled buttons on fetch failures.
**Action:** When adding async button loading states, ensure that prompt/dialog interruptions cancel out *before* the UI state changes, and always use `finally` to restore the button reference securely.

## 2024-10-25 - [Actionable Empty States in Vanilla JS Data Tables]
**Learning:** When datasets are empty, leaving the table blank causes user confusion. Injecting an actionable empty state (with a clear message and a primary call-to-action button mapped to the creation modal) directly into the rendering container's `innerHTML` by returning early prevents rendering errors and significantly improves discoverability.
**Action:** Always implement empty states with an actionable CTA button for data tables that can be empty, utilizing existing design system classes (e.g., `btn`, `btn-primary`) rather than introducing inline styles to adhere to strict framework boundaries.
