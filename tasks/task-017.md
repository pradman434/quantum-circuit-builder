<!-- iteration: 1 -->
## Task-017: Phase 3 — parameterized qubit counts + gate-by-gate phrasing
**Assigned to:** SW Engineer (unassigned until Director confirms team size)
**Depends on:** Task-012
**Can run in parallel with:** Task-018
**Estimated complexity:** L
**Deliverable:** Parser support for "Grover for N qubits" and gate-by-gate phrasing ("Hadamard on qubit 0, then CNOT 0 to 1"), building valid models within the 24-qubit draw ceiling.
**Unit test requirement:** Parameterized counts build correct N-qubit circuits up to the ceiling; gate-by-gate phrasing produces the exact intended gate sequence; out-of-range counts are rejected clearly.
