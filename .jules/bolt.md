## 2024-11-04 - In-memory O(1) Map Lookups
**Learning:** In-memory repositories frequently use `.find()` or `.filter()` which can lead to O(N) lookup times on every access.
**Action:** When working with in-memory array collections, initialize a parallel `Map` during constructor execution and update it synchronously on `create`, providing O(1) lookups for `getById` operations.
