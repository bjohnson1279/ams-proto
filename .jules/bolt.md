## 2025-02-28 - Avoid O(M * N) and string recreation in reconciliations
**Learning:** Found nested loops and redundant string allocations (lowercasing strings) in `reconcileItems` where downloaded items are compared against all existing policies and customers. In array scanning inside a large loop, calculating `.toLowerCase()` inside `find()` on every single existing object creates many temporary string allocations, thrashing memory and degrading execution speed.
**Action:** When matching arrays against each other in $O(M \times N)$ loops, use `Map` for $O(1)$ lookups on primary keys (like `policyNumber`), and precompute derived string values outside the innermost loop.

## 2024-05-19 - Deduplication Engine String Normalization Optimization
**Learning:** String normalization (regex replace, lowercasing) inside O(N*M) loops can be a hidden bottleneck in evaluation engines like DeduplicationEngine.
**Action:** Always check if repetitive data formatting/normalization inside nested loops or frequent evaluation calls can be pre-calculated and cached upon instantiation/initialization.
## 2026-08-16 - [O(n²) to O(n) Optimization in Array Searching]
**Learning:** Replaced O(n²) nested `findIndex` operations with pre-computed O(n) hash map lookups (`Map`) in `importLegacyPayload` function (src/services/ams.service.ts), resulting in significant performance improvement, especially when large numbers of records are involved in data migrations.
**Action:** Always evaluate loops that contain nested `find` or `findIndex` operations over large data arrays and consider pre-computing index maps for O(1) lookups.
