<!-- iteration: 2 -->
## Task-002: CircuitModel types, validators, and algorithm builders (Grover-3, Bell)
**Assigned to:** SW Engineer (unassigned until Director confirms team size)
**Depends on:** Task-001
**Can run in parallel with:** Task-004
**Estimated complexity:** M
**Deliverable:** `CircuitModel`/`Gate` TypeScript types (Phase-1 gate set h/x/z/cx/**ccx**), a validator enforcing all §1.1 constraints, and pure `build(qubits)` functions for Grover (default 3, target |111⟩, full H→oracle→diffusion per §1.3) and Bell.
**Unit test requirement:** Builders produce constraint-valid models; the Grover-3 builder output matches the §1.3 canonical fixture exactly; the validator rejects out-of-range qubit indices, unknown gate names, self-controlling gates, and non-contiguous/decreasing `step` values.
