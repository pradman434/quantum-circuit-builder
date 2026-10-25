<!-- iteration: 2 -->
## Task-005: SVG renderer + step highlight
**Assigned to:** SW Engineer (unassigned until Director confirms team size)
**Depends on:** Task-002A
**Can run in parallel with:** Task-003, Task-006
**Estimated complexity:** M
**Deliverable:** Thin in-house SVG renderer drawing one wire per qubit, gates left-to-right by `step`, control dots + multi-control connectors (incl. **ccx**/Toffoli for Grover-3), and an active-step column highlight.
**Unit test requirement:** The Grover-3 circuit renders all 21 gates in the correct columns with correct ccx control connectors; the active-step highlight lands on the right column; rendering does not depend on the library's own SVG output.
