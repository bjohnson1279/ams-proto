## 2025-02-14 - [Actionable Empty States for Vanilla JS Tables]
**Learning:** In vanilla JS table rendering (like `renderCertificatesTable` or `renderHoldersTable`), returning an empty table body when the dataset is empty leaves users without guidance.
**Action:** Always implement a dedicated `if (array.length === 0)` block to inject an empty state `<tr>` containing a descriptive message and a call-to-action button (reusing existing modal/creation functions) before the `.forEach` loop. Ensure to `return` early to skip the loop.
