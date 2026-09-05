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
## 2025-02-12 - [Pre-computing and caching string operations in frontend filtering]
**Learning:** Sequential `.toLowerCase()` conversions and redundant string concatenations within a `.filter()` loop on a large dataset executed repeatedly via keystroke events caused significant CPU/memory overhead. Caching the dataset in memory and pre-computing a single concatenated, lowercased `_searchString` reduced the filtering operation to O(1) property access and eliminated redundant backend GET requests.
**Action:** When implementing client-side search filtering on static datasets, cache the initial network response, pre-compute normalized search strings during initialization, and filter the cached dataset using those pre-computed values rather than executing transformations inline during the filter loop.

## 2026-08-26 - [O(n*m) to O(n+m) Optimization in Certificate Generation]
**Learning:** Found an `O(N)` array `.find()` operation (`carriers.find`) happening *inside* a `.forEach` loop over `selectedPolicies` in `generateCertificate` (src/services/certificate.service.ts). For each unique carrier across policies, it scanned the entire carriers array. This creates unnecessary CPU overhead, especially if the number of policies and carriers grows.
**Action:** Always pre-compute a `Map` of lookup data (like carriers by ID) *before* entering a loop, enabling `O(1)` access inside the iteration and reducing the overall time complexity from `O(N*M)` to `O(N+M)`.

## 2026-08-30 - Optimize Bulk Certificate Issue Context
**Learning:** In bulk operations calling an inner generator function inside a loop (e.g., `bulkIssueCertificates` calling `generateCertificate`), running O(H * (P + C)) database array scans per loop iteration causes severe CPU overhead.
**Action:** Pre-fetch necessary resources (customer, policies, carrier maps) outside the bulk loop and pass them as an optional  parameter to the generator function to reduce complexity to O(P + C + H).

## 2026-08-30 - Optimize Bulk Certificate Issue Context
**Learning:** In bulk operations calling an inner generator function inside a loop (e.g., bulkIssueCertificates calling generateCertificate), running O(H * (P + C)) database array scans per loop iteration causes severe CPU overhead.
**Action:** Pre-fetch necessary resources (customer, policies, carrier maps) outside the bulk loop and pass them as an optional context parameter to the generator function to reduce complexity to O(P + C + H).

## 2026-08-31 - Reduce O(N) array scans with single loop
**Learning:** Found multiple distinct `.find()` operations in `generateCertificate` that iterated over the same `pol.coverages` array to extract different attributes (`eachOcc` and `genAgg`).
**Action:** When evaluating arrays for multiple attributes, replace multiple distinct `.find()` operations with a single `for...of` loop with early breaks to reduce redundant O(N) array scans and CPU overhead.
## 2026-08-30 - Replace Multiple find() with Single Loop in Array Scans
**Learning:** Found multiple `.find()` operations being used sequentially on an array to extract different attributes (like specific coverages within a policy object) inside a loop (`generateCertificate` in `src/services/certificate.service.ts`). Each `.find()` causes a separate O(N) pass over the array and often includes inline string allocations (e.g. `.toLowerCase()`) in the condition, creating significant CPU/memory overhead.
**Action:** When evaluating an array for multiple attributes, replace multiple distinct `.find()` operations with a single `for...of` loop. Pre-compute inline string allocations (like `.toLowerCase()`) once per element within the loop body to reduce redundant O(N) array scans and garbage collection pressure.

## 2026-09-02 - Replace Multiple find() with Single Loop in AL3 Parsing
**Learning:** Found multiple `.find()` operations being used sequentially on an array to extract different attributes (like specific keys from AL3 parsing parts) inside a loop (`parseAl3Content` in `src/services/al3Parser.service.ts`). Each `.find()` causes a separate O(N) pass over the array, creating CPU overhead when processing large payloads.
**Action:** When evaluating an array for multiple attributes, replace multiple distinct `.find()` operations with a single `for...of` loop with inline checks to prevent redundant O(N) array scans and garbage collection pressure.

## 2026-09-08 - Consolidate Multiple Array Reduces
**Learning:** Found multiple `.reduce()` operations being used sequentially on the same array to calculate distinct aggregates (like `totalPremium` and `totalCommission` in `src/services/carrierDownload.service.ts`). Each `.reduce()` causes a separate O(N) pass over the array, creating unnecessary iteration overhead for large datasets.
**Action:** When calculating multiple aggregates over the same array, combine them into a single `for...of` loop to calculate all metrics in one O(N) pass and prevent redundant array iterations.

## 2026-09-08 - Avoid DDL inside Transaction Inserts
**Learning:** Executing DDL statements (like `ALTER TABLE`) inside a transactional query path (e.g. `INSERT`) acquires aggressive table-level locks, destroying concurrency and severely degrading performance. In `createJournalEntry`, an inline `ALTER TABLE` was evaluated on every insert.
**Action:** Ensure all schema setup (like adding columns) is restricted to database initialization logic/migrations, not inline within application-level CRUD operations.
