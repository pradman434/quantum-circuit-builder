<!-- iteration: 2 -->
## Task-003: QASM 2.0 exporter + golden fixtures
**Assigned to:** SW Engineer (unassigned until Director confirms team size)
**Depends on:** Task-002A
**Can run in parallel with:** Task-005, Task-006
**Estimated complexity:** M
**Deliverable:** `toQasm2(circuit)` emitting `OPENQASM 2.0;` + `include "qelib1.inc";` + `qreg` and only qelib1.inc gate calls, deterministic output, with committed golden QASM fixtures for Grover-3 and Bell.
**Unit test requirement:** Output matches the golden fixture byte-for-byte; starts with the required header lines; same model always yields identical text.
