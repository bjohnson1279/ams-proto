## 2024-08-30 - [Consistent Async Button Loading States]
**Learning:** Vanilla JS implementation of disabled states and loading text replacement is effective but verbose, requiring robust `try/finally` blocks and event targeting to prevent permanently disabled buttons on fetch failures.
**Action:** When adding async button loading states, ensure that prompt/dialog interruptions cancel out *before* the UI state changes, and always use `finally` to restore the button reference securely.
