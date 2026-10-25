<!-- iteration: 1 -->
## Task-015: "Learn more" URL wiring (data-driven, hidden if absent)
**Assigned to:** SW Engineer (unassigned until Director confirms team size)
**Depends on:** Task-007
**Can run in parallel with:** all Phase-2 tasks
**Estimated complexity:** S
**Deliverable:** A `LEARN_MORE_URLS` map keyed by `algorithmId`; the explanation panel shows the external "Learn more →" link when a URL exists and hides it cleanly when absent. URLs supplied by PM (HLD OQ-3).
**Unit test requirement:** Link renders with the correct href when a URL is present; no broken/empty link renders when the URL is missing.
