## 2024-05-18 - Visual Feedback for Async Operations
**Learning:** Adding explicit disabled and loading text states ("⏳ Processing...") to async action buttons (like financial post buttons) drastically improves user feedback and prevents accidental duplicate submissions.
**Action:** Always verify long-running or financial async frontend interactions are wrapped with disable logic in a try/finally block so state is cleanly restored.
