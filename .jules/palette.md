## 2024-08-30 - [Consistent Async Button Loading States]
**Learning:** Vanilla JS implementation of disabled states and loading text replacement is effective but verbose, requiring robust `try/finally` blocks and event targeting to prevent permanently disabled buttons on fetch failures.
**Action:** When adding async button loading states, ensure that prompt/dialog interruptions cancel out *before* the UI state changes, and always use `finally` to restore the button reference securely.

## 2024-10-25 - [Actionable Empty States in Vanilla JS Data Tables]
**Learning:** When datasets are empty, leaving the table blank causes user confusion. Injecting an actionable empty state (with a clear message and a primary call-to-action button mapped to the creation modal) directly into the rendering container's `innerHTML` by returning early prevents rendering errors and significantly improves discoverability.
**Action:** Always implement empty states with an actionable CTA button for data tables that can be empty, utilizing existing design system classes (e.g., `btn`, `btn-primary`) rather than introducing inline styles to adhere to strict framework boundaries.

## 2024-11-20 - [Sequential Empty States for Multi-Table Fetches]
**Learning:** When a single function (like `fetchAccountingData`) fetches and populates multiple tables sequentially, returning early after rendering the first empty state prevents subsequent tables from rendering correctly (either with data or their own empty state).
**Action:** Use an `if/else` block for each dataset within the sequential process instead of early returns to ensure all tables are processed independently and their respective empty states or data populate as intended.

## 2024-11-21 - [Dark Mode Focus Visibility and Custom Layouts]
**Learning:** Default browser focus rings often lack sufficient contrast against dark theme backgrounds (`#0b0f19`), leaving keyboard users disoriented. Custom dark-mode themes require explicit `:focus-visible` overrides using high-contrast design tokens (e.g., `var(--accent-cyan)`).
**Action:** When working on dark-mode interfaces, always explicitly define `:focus-visible` styles with sufficient outline width and contrast to ensure keyboard navigation is visible and accessible.
