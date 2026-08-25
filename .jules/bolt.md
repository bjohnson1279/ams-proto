## 2025-02-28 - Avoid O(M * N) and string recreation in reconciliations
**Learning:** Found nested loops and redundant string allocations (lowercasing strings) in `reconcileItems` where downloaded items are compared against all existing policies and customers. In array scanning inside a large loop, calculating `.toLowerCase()` inside `find()` on every single existing object creates many temporary string allocations, thrashing memory and degrading execution speed.
**Action:** When matching arrays against each other in $O(M \times N)$ loops, use `Map` for $O(1)$ lookups on primary keys (like `policyNumber`), and precompute derived string values outside the innermost loop.

## 2024-05-19 - Deduplication Engine String Normalization Optimization
**Learning:** String normalization (regex replace, lowercasing) inside O(N*M) loops can be a hidden bottleneck in evaluation engines like DeduplicationEngine.
**Action:** Always check if repetitive data formatting/normalization inside nested loops or frequent evaluation calls can be pre-calculated and cached upon instantiation/initialization.

## 2026-08-16 - [O(n²) to O(n) Optimization in Array Searching]
**Learning:** Replaced O(n²) nested `findIndex` operations with pre-computed O(n) hash map lookups (`Map`) in `importLegacyPayload` function (src/services/ams.service.ts), resulting in significant performance improvement, especially when large numbers of records are involved in data migrations.
**Action:** Always evaluate loops that contain nested `find` or `findIndex` operations over large data arrays and consider pre-computing index maps for O(1) lookups.

## 2026-08-17 - [Avoid Wasteful Array Copies Before Filtering]
**Learning:** Found O(N) array spreads (e.g., `[...this.customers]`) being used to create copies of large collections *before* applying `.filter()` in `getCustomers` and `getPolicies`. This forces a full memory allocation of the entire array, only to immediately discard it for the filtered result.
**Action:** When filtering collections, apply `.filter()` directly to the original collection reference first. Only use the spread operator (`[...result]`) at the very end if returning an unfiltered list and mutation protection is required.

## 2026-08-17 - Avoid Wasteful Array Copies Before Filtering in CertificateService
**Learning:** Found O(N) array spreads (e.g., `[...this.certificateHolders]`) being used to create copies of large collections *before* applying `.filter()` in `getCertificateHolders` and `getCertificates`. This forces a full memory allocation of the entire array, only to immediately discard it for the filtered result.
**Action:** When filtering collections, apply `.filter()` directly to the original collection reference first. Only use the spread operator (`[...result]`) at the very end if returning an unfiltered list and mutation protection is required.

## 2026-08-17 - Avoid O(N*M) and excessive memory mapping during data reconciliation
**Learning:** Found nested loops and redundant object spread mappings (`...c`) in `reconcileItems` where downloaded items are compared against all existing policies and customers. Constructing `customerSearchData` created a new large object for every customer, thrashing memory. Scanning the array with `.find(c => c.feinOrSsn === ...)` created a worst-case $O(N \times M)$ search path for exact matches.
**Action:** When filtering or reconciling datasets, use `Map` for $O(1)$ lookups on unique keys (like FEIN/SSN) before falling back to array scans. Also, preserve original object references (e.g., `{ customer: originalObj }`) instead of spreading (`...originalObj`) to save significant memory allocations during map pre-computation.

## 2026-08-22 - [Array Filter Consolidation]
**Learning:** Sequential `.filter()` calls on in-memory arrays create wasteful intermediate arrays and run O(K*N) iterations.
**Action:** Always combine sequential `.filter()` operations into a single loop pass to save memory allocations and CPU cycles, especially for large datasets.
