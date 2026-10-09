## 2023-10-07 - Replaced full-table fetch with direct ID lookup for Carrier in AmsService
**Learning:** In `generateDecPage`, the code was previously fetching the entire carriers table into memory and performing an O(N) array `.find()` scan to retrieve a single carrier by ID, creating a performance bottleneck and memory bloat.
**Action:** When a method needs to resolve a single relational entity (like a `carrierId` associated with a `policy`), always check if a direct `getById` method exists on the repository and use it to perform an O(1) query instead of fetching the entire dataset.
