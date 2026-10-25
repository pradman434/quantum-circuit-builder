<!-- iteration: 2 -->
## Task-002A: lib-adapter.ts — the single library-boundary module
**Assigned to:** SW Engineer (unassigned until Director confirms team size)
**Depends on:** Task-002
**Can run in parallel with:** Task-004
**Estimated complexity:** S
**Deliverable:** `lib-adapter.ts`, the ONLY file importing `quantastica/quantum-circuit`, exposing `toLib(circuit)`, `fromLib(qc)`, `libToQasm(qc)`, and `libStateVector(qc)`. All other modules (exporter, renderer, simulator) reach the library only through these functions, satisfying the HLD single-point-of-failure isolation.
**Unit test requirement:** Round-trip `fromLib(toLib(model))` reproduces the exact `CircuitModel` (incl. ccx gates); swapping the import is provably confined to this one file (no other module imports the library).
