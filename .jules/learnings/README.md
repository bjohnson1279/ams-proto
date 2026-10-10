# Modular Agent Learnings Directory

To eliminate Git merge conflict collisions at the end-of-file boundary of `.jules/*.md` during concurrent bot Pull Requests:

1. Development agents may write their dated learning notes to individual files in this directory:
   `YYYY-MM-DD-<agent>-<topic>.md` (e.g. `2026-10-09-bolt-policy-filter.md`).
2. Each file must adhere to standard dated header format:
   ```markdown
   ## YYYY-MM-DD - [Title]
   **Learning:** ...
   **Action:** ...
   ```
3. A post-merge workflow or `scripts/smart_union_merge.py` compiles these entries into the canonical logs.
