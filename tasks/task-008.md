<!-- iteration: 1 -->
## Task-008: Independent QASM validation CI gate (Qiskit)
**Assigned to:** SW Engineer (unassigned until Director confirms team size)
**Depends on:** Task-003
**Can run in parallel with:** Task-007
**Estimated complexity:** S
**Deliverable:** A CI step (not shipped in the browser bundle) that feeds `toQasm2()` output to an independent OpenQASM 2.0 parser (Qiskit `from_qasm_str`) and fails the build on any parse error.
**Unit test requirement:** The gate passes on valid golden QASM and fails on a deliberately malformed QASM fixture — proving it uses an independent parser, not the circuit library's own importer.
