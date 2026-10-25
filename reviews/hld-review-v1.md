# HLD Review — v1

## Summary
The HLD is well-scoped and correctly treats the no-backend constraint honestly (N/A sections with reasons, not omissions), and the drawing-approach decision is sound. But the design has a load-bearing contradiction in its own simulation cap, under-specifies the two correctness surfaces that the requirements make pass/fail gates (the rule-based parser and QASM export), and leans so hard on a single third-party library that three separate requirements (F3 draw, F4 export, F6 simulation) fail together if that one dependency does. The biggest concern is that the headline Grover-3 acceptance criterion depends on an unverified assumption that `quantastica/quantum-circuit`'s QASM output parses cleanly in an *independent* QASM 2.0 parser.

## Findings

### [CRITICAL] QASM 2.0 export correctness is validated against the library's own importer, not an independent parser
**Problem:** The acceptance criterion requires export to parse "with zero errors in a QASM 2.0 parser," but the HLD's stated validation is to "round-trip through the library's own QASM importer in tests" — the same package that produced the output.
**Impact:** A library that emits non-standard QASM (common: `u`/`u3` variants, implicit `include "qelib1.inc"`, gate names not in qelib1, reg-sizing quirks) will happily re-import its own output while a real external parser (Qiskit's, the ANTLR reference grammar) rejects it — so the Phase 1 "done" gate passes in CI and fails on the actual success criterion.
**Suggested fix:** Add a golden-file test that runs the exported `.qasm` through an *independent* OpenQASM 2.0 parser (e.g. Qiskit's `QuantumCircuit.from_qasm_str` or the reference ANTLR grammar), not the circuit library's own importer, as the Phase 1 gate.

### [CRITICAL] The simulation qubit cap has three different values in one document
**Problem:** The component table says simulator handles "≤ ~12", the NFR row says "Hard cap (e.g. ≤ 12–15 qubits)" and "explode past ~15", and the wireframe shows "state view unavailable above 15 qubits" — three inconsistent numbers for the single hard limit the whole latency and memory NFR rests on.
**Impact:** 2^n is 4K amplitudes at 12 qubits and 32K at 15 — a >8x memory and compute difference; the LLD cannot implement a cap that the HLD states as 12, 15, and "~12" simultaneously, and the p95 < 200 ms latency target is unverifiable until this number is one number.
**Suggested fix:** Pick one hard cap (12 for the "snappy" target per Open Question 2) and one draw-only ceiling, state both as exact integers, and make every table, wireframe, and NFR row use those exact values.

### [MAJOR] Single library is a single point of failure across three requirements with no stated fallback
**Problem:** `quantastica/quantum-circuit` is simultaneously the drawing source (F3), the QASM import/export engine (F4), and the state-vector simulator (F6 math), and the design names no fallback if it is abandoned, breaks on a browser update, or has a correctness bug.
**Impact:** A single unmaintained dependency (last-release risk, a breaking transitive dep, a wrong gate matrix) takes down three of the six features at once; "pin exact versions" freezes the bug in place, it does not mitigate it.
**Suggested fix:** Isolate the library behind the already-planned internal module surfaces (Parser/Exporter/Simulator) so each can be swapped independently, and add a CI correctness check (golden state vectors + golden QASM) that would catch a bad library release before it ships.

### [MAJOR] Rule-based parser has no defined grammar, ambiguity policy, or test matrix — yet it is the entry point for every success criterion
**Problem:** The parser is described only as "rule-based, maps named algorithms + qubit count," with no stated matching strategy (exact string? keyword? regex?), no case/whitespace/synonym policy, and no handling for near-misses like "Grovers algorithm 3 qubit" or "Grover 3q."
**Impact:** The single headline criterion — typing "Grover's algorithm for 3 qubits" draws the correct circuit — is a coin-flip on real user phrasing variance; and a loose matcher that silently picks the wrong algorithm is worse than a clear "not recognized," which violates F2's own acceptance (unknown input must name what IS supported).
**Suggested fix:** Specify the parser as a normalized-keyword matcher with an explicit synonym/qubit-count extraction rule and a defined "ambiguous → ask/reject, never guess" policy, backed by a test matrix of phrasing variants per supported algorithm.

### [MAJOR] Untrusted `.json`/`.qasm` file load is named as a risk but given no concrete validation design
**Problem:** The Security section correctly identifies file load as "the one untrusted-input path" and says "validate/parse defensively; never eval; cap sizes" — but states no schema, no size number, and no bound on what a malicious/malformed file can do to the simulator.
**Impact:** A crafted `.json` with `numQubits: 40` (or a huge `gates` array) sent straight into `stepStates()` triggers a 2^40 allocation and hangs/crashes the tab before any cap is checked; "validate defensively" is an instruction, not a design, so the LLD has nothing to implement against.
**Suggested fix:** Specify a concrete loader contract — JSON-schema-validate the circuit file (types, `numQubits` ≤ draw ceiling, `gates[].qubits` in range, max file size in KB) and reject before constructing the model or invoking the simulator.

### [MINOR] `schemaVersion` evolution policy only covers "newer = reject," not actual migration
**Problem:** The file format reserves `schemaVersion` and handles a *newer* version by rejecting it, but says nothing about reading an *older* version once the schema evolves.
**Impact:** The first schema change (v1→v2) silently makes every previously saved v1 file either unloadable or mis-parsed, breaking the "reloads 100% of the time" criterion for existing files.
**Suggested fix:** State that the loader must accept all older schema versions via a migration step (or explicitly commit to v1-forever with a documented reason), and add a saved-file fixture per version to the test suite.

### [MINOR] "Works offline after first load" NFR has no service-worker / caching mechanism named
**Problem:** The availability NFR promises offline operation and the deploy section says "static files behind a CDN," but nothing specifies HOW the app is available on a second visit with no network (service worker? app cache? just browser HTTP cache, which is not guaranteed offline?).
**Impact:** Relying on default browser HTTP caching does not reliably satisfy "works offline" — a cache eviction or a cache-busting deploy leaves the user with a blank page offline, contradicting the stated NFR.
**Suggested fix:** Name the mechanism — a service worker (e.g. Vite PWA plugin) that precaches the app shell, library, and KaTeX — as the concrete design that achieves the offline NFR.

### [MINOR] No stated behavior when KaTeX or the library fails to load
**Problem:** The design bundles KaTeX and the circuit library but describes no degraded-mode behavior if one fails to initialize (corrupt cache, partial load).
**Impact:** A failed KaTeX load could blank the explanation panel or throw, and a failed library load takes down draw/export/sim with no user-facing message.
**Suggested fix:** Specify graceful degradation — if math rendering is unavailable, show raw matrix text; if the engine fails to load, show a clear "reload required" message rather than a blank or thrown UI.

## Categories with no findings
- **Scale gaps:** No issues found. Correctly N/A — static assets, no app tier; "10x users" is just more CDN requests. Legitimately addressed.
- **Server-side DB / cache / queue / distributed transactions:** No issues found. Correctly N/A with stated reasons; not re-raised per instruction.
- **Server auth / privilege escalation:** No issues found. No accounts, no server data, no roles — nothing to escalate to.
- **PII handling:** No issues found. Nothing collected, stored, or transmitted; the "no analytics capturing input text in Phase 1–2" note is the right call.
- **RPO/RTO / data recovery:** No issues found. Correctly reframed as "user owns their files"; the only real risk (silent corrupt load) is captured under the untrusted-file finding above.
- **Drawing-approach decision (a/b/c):** No issues found. Option (b) is correctly disqualified as it violates the no-backend/offline/privacy requirements; option (c) is correctly rejected since it would not remove the dependency; (a) is the right call. The one residual risk (dependency concentration) is raised as a MAJOR above, not against the decision itself.
