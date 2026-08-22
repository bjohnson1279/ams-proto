## 2026-08-22 - [Array Filter Consolidation]
**Learning:** Sequential `.filter()` calls on in-memory arrays create wasteful intermediate arrays and run O(K*N) iterations.
**Action:** Always combine sequential `.filter()` operations into a single loop pass to save memory allocations and CPU cycles, especially for large datasets.
