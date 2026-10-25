<!-- iteration: 1 -->
## Task-010: Phase-1 acceptance — Grover-3 draws + valid QASM (end-to-end golden)
**Assigned to:** SW Engineer (unassigned until Director confirms team size)
**Depends on:** Task-003, Task-005, Task-006, Task-008, Task-009
**Can run in parallel with:** none
**Estimated complexity:** S
**Deliverable:** An end-to-end golden test proving the headline success criterion: typing "Grover's algorithm for 3 qubits" draws the correct circuit, shows a text explanation, and its export parses as valid OpenQASM 2.0. Includes a p95 < 200 ms build→draw perf assertion for ≤12 qubits.
**Unit test requirement:** The full pipeline matches the committed Grover-3 golden model + golden QASM (validated by the independent parser); perf assertion passes.
