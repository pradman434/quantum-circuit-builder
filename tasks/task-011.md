<!-- iteration: 2 -->
## Task-011: Save/load files (toFile/fromFile, 256KB cap, schema validate, migrate)
**Assigned to:** SW Engineer (unassigned until Director confirms team size)
**Depends on:** Task-002, Task-010, Task-013
**Can run in parallel with:** Task-012
**Estimated complexity:** M
**Deliverable:** `circuit-file.ts` with `toFile` (JSON download) and `fromFile` implementing the full loader contract: 256 KB cap, JSON-schema validation (incl. `step` non-negative/non-decreasing/contiguous), index-bounds check, migrate older `schemaVersion`, reject newer, never `eval`, typed `LoadError`, no partial load. Validates against the settled Phase-2 gate vocabulary from Task-013.
**Unit test requirement:** Every `LoadError` branch is covered; a file with out-of-order `step` values is rejected; a crafted `numQubits:40` file loads+draws but never invokes the simulator; a round-trip (download→load) reproduces the exact gate sequence; an older-version fixture migrates successfully.
