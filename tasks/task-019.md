<!-- iteration: 1 -->
## Task-019: Phase 3 — QASM 2.0 import (round-trip build→export→import)
**Assigned to:** SW Engineer (unassigned until Director confirms team size)
**Depends on:** Task-003, Task-018
**Can run in parallel with:** none
**Estimated complexity:** L
**Deliverable:** `fromQasm2(text)` mapping an OpenQASM 2.0 string back into a `CircuitModel`, completing the Phase-3 round-trip (build → export → import) with no loss.
**Unit test requirement:** For each supported algorithm, export then re-import yields a model equal to the original (gates, order, qubit count); malformed QASM returns a clear `ParseResult` error, never a partial model.
