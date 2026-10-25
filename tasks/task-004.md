<!-- iteration: 1 -->
## Task-004: Parser (normalize, keyword match, never-guess) + test matrix
**Assigned to:** SW Engineer (unassigned until Director confirms team size)
**Depends on:** Task-001
**Can run in parallel with:** Task-002
**Estimated complexity:** M
**Deliverable:** `parse(text)` with input normalization, per-algorithm keyword matching, first-integer qubit extraction, and a never-guess ambiguity policy that names supported algorithms on zero/multiple matches.
**Unit test requirement:** A phrasing-variant matrix (correct, missing apostrophe, abbreviated, extra words) all resolve to the right algorithm; near-miss strings are rejected with the supported-list message; empty input returns the example prompt.
