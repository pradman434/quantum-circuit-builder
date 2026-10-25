<!-- iteration: 2 -->
## Task-013: Gate additions (CZ) + promote shared gate vocabulary
**Assigned to:** SW Engineer (unassigned until Director confirms team size)
**Depends on:** Task-003, Task-005, Task-006, Task-010
**Can run in parallel with:** Task-016
**Estimated complexity:** L
**Deliverable:** CZ support across the full stack — `GateName`/model vocabulary, renderer shapes + multi-control connectors, QASM export, simulator matrices. (`ccx`/Toffoli already lands in Phase 1 for Grover-3.) This task owns the shared `GateName`/`CircuitModel` vocabulary change for Phase 2 and **must land before Tasks 011 and 012** so they build on a settled model.
**Unit test requirement:** CZ renders with correct control dots/connectors, exports to valid qelib1.inc QASM (independent-parser checked), and produces correct golden state vectors (Qiskit-generated); the expanded `GateName` union compiles across loader, builders, exporter, renderer, and simulator with no inconsistency.
