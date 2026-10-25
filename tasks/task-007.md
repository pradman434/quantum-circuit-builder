<!-- iteration: 1 -->
## Task-007: Explanation panel — plain English (Phase 1) + KaTeX scaffold + degraded mode
**Assigned to:** SW Engineer (unassigned until Director confirms team size)
**Depends on:** Task-005, Task-006
**Can run in parallel with:** Task-008
**Estimated complexity:** M
**Deliverable:** `ExplanationPanel` showing per-algorithm plain-English text (Phase 1), a KaTeX mount point for Phase 2 math, the sim-cap note when state is unavailable, and a "Learn more →" link (hidden if URL absent). Degraded mode: raw matrix/state text if KaTeX fails to load.
**Unit test requirement:** Panel renders plain-English text for each Phase-1 algorithm; shows the cap note when `states.unavailable`; hides the link when no URL; falls back to raw text when KaTeX is stubbed as failed.
