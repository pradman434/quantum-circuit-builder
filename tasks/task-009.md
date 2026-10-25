<!-- iteration: 1 -->
## Task-009: App shell wiring + service-worker offline precache
**Assigned to:** SW Engineer (unassigned until Director confirms team size)
**Depends on:** Task-005, Task-007
**Can run in parallel with:** none
**Estimated complexity:** M
**Deliverable:** The full Phase-1 app wired together (input → parser → renderer → simulator → explanation) with a service worker precaching the app shell, circuit library, and KaTeX for offline reload.
**Unit test requirement:** End-to-end mount runs the Grover-3 build flow; an offline-reload test (load, disconnect network, reload) still renders the app.
