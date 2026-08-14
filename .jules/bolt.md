## 2024-05-19 - Deduplication Engine String Normalization Optimization
**Learning:** String normalization (regex replace, lowercasing) inside O(N*M) loops can be a hidden bottleneck in evaluation engines like DeduplicationEngine.
**Action:** Always check if repetitive data formatting/normalization inside nested loops or frequent evaluation calls can be pre-calculated and cached upon instantiation/initialization.
