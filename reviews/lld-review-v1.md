<!-- iteration: 1 -->
# LLD Review — v1

**Reviewer:** Morgan (Sr Engineer, adversarial) · **Project:** `quantum-circuit-builder`
**Reviewing:** `LLD.md` (DRAFT iteration 1) against `requirements.md` (FINAL) and `HLD.md` (FINAL — LOCKED)

## Summary
The LLD is well-structured and honors most LOCKED HLD decisions (own model + adapter boundary, 12/24 caps, independent QASM validator, typed loader contract). But it fails on the one thing that matters most: the headline Grover-3 success criterion has no correct, concrete expected artifact anywhere — the only Grover-3 gate list in the document (§1.3) is mathematically not Grover (no diffusion operator) and uses a `ccx` gate the task breakdown does not build until Phase 2, so Phase 1 cannot actually draw the circuit the requirements demand. Several "can run in parallel" claims also put two tasks into the same files simultaneously.

## Findings

### [CRITICAL] Grover-3 reference circuit in §1.3 is not Grover — missing the entire diffusion operator
**Problem:** The §1.3 example `CircuitModel` is a 6-gate fragment (3× H, then h/ccx/h on q2) with no diffusion operator and no correct oracle, yet it is the only concrete Grover-3 gate sequence in the LLD and the requirements' headline success criterion demands "Hadamard layer → oracle → diffusion."
**Impact:** The sole implementable spec for the headline case is wrong; an engineer coding to §1.3 (or a golden fixture copied from it) ships a circuit that does not amplify |111⟩ and fails the stated acceptance criterion, while the "illustrative, fixed by the golden fixture" disclaimer points to a fixture (Task-003/010) whose expected sequence is never written down — so the correct sequence exists nowhere in the design.
**Suggested fix:** Replace §1.3 with the full, correct Grover-3 gate list (H layer; oracle for |111⟩; diffusion = H layer, X layer, multi-controlled-Z, X layer, H layer) and commit it verbatim as the Task-010 golden fixture, so the headline artifact is specified, not deferred.

### [CRITICAL] Grover-3 needs a multi-controlled gate (`ccx`/MCZ) that the LLD schedules only in Phase 2
**Problem:** `GateName` tags `ccx` as "Phase 2" and Task-002 (Phase 1) builds Grover/Bell with only h/x/z/cx, but a correct 3-qubit Grover oracle and diffusion both require a multi-controlled gate (CCX or a multi-controlled Z), and Task-013 (CZ/Toffoli across the stack) is Phase 2.
**Impact:** Phase 1 (Task-002/010) literally cannot construct a correct Grover-3 model with its allowed gate set, so the Phase-1 "Done when" gate — the project's whole reason for Phase 1 — is unmeetable as sequenced; the §1.3 example quietly uses `ccx` and exposes the contradiction.
**Suggested fix:** Move `ccx` (and whatever multi-controlled primitive the diffusion needs) plus its exporter/renderer/simulator support into Phase 1 (Task-002/003/005/006), and state in §5 that Phase 1's gate vocabulary is h/x/z/cx/ccx, not a Phase-2 add.

### [MAJOR] "Parallel" tasks 003 and 006 both own `lib-adapter.ts`, so they cannot run in parallel
**Problem:** Task-003 (exporter) is declared parallel with Task-006 (simulator), but §2.2/§2.6 route the exporter's QASM through `libToQasm` in `lib-adapter.ts`, and Task-006 is the task that creates `lib-adapter.ts` via the adapter — so 003 depends on a file 006 produces.
**Impact:** Two engineers assigned 003 and 006 concurrently (the LLD's §6 Phase-1 three-engineer plan) collide on `lib-adapter.ts` ownership or block each other, breaking the stated parallelism and the critical-path estimate.
**Suggested fix:** Split `lib-adapter.ts` into its own Phase-1 task depended on by both 003 and 006 (or assign adapter ownership to 002), and correct the §5 "parallel with" columns accordingly.

### [MAJOR] Phase-2 tasks 011, 012, 013 claim mutual parallelism while all three write the shared model/validator files
**Problem:** Task-013's deliverable is "CZ/Toffoli across model vocabulary, renderer, export, simulator," Task-012 adds algorithm builders to the model, and Task-011 adds loader validation of the model — and all three are marked "can run in parallel," so three engineers edit the `GateName` union / `CircuitModel` / validator at once.
**Impact:** Concurrent edits to the same model and validator files produce merge conflicts and inconsistent gate vocabularies (013 adds `cz`/`ccx` that 011's validator and 012's builders must already know about), so the "4 engineers in parallel after 010" plan in §6 will serialize in practice or ship an inconsistent model.
**Suggested fix:** Make 013 (gate-vocabulary expansion) land first and have 011 and 012 depend on it, OR extract the `GateName`/model change into a small shared task that 011/012/013 all depend on, and fix the "parallel with" columns.

### [MAJOR] Golden state-vector fixtures (Task-006) depend on the Grover-3 sequence that §1.3 gets wrong
**Problem:** Task-006 commits "golden state vectors" for Grover-3 as the correctness guard (HLD MAJOR-3), but the only Grover-3 sequence in the LLD is the incorrect §1.3 fragment, and no correct sequence is specified for the fixture author to simulate.
**Impact:** The golden-correctness check — the HLD's named SPOF mitigation and the thing that is supposed to catch a bad library release — will enshrine the wrong expected state vector if authored from §1.3, making the guard validate wrongness instead of correctness.
**Suggested fix:** Specify the correct Grover-3 sequence once (per CRITICAL-1) and require Task-006's golden vectors to be derived from that specified sequence, cross-checked against an independent simulator (e.g. Qiskit) exactly as the QASM gate uses an independent parser.

### [MINOR] `Gate.step` monotonic-non-decreasing invariant is stated but never enforced by the validator
**Problem:** §1.1 says "`gates[i].step` is monotonic non-decreasing" but the §1.1 loader constraints and Task-002's validator test list (indices, gate names, self-control) do not include a step-ordering/monotonicity check.
**Impact:** A hand-edited or migrated file with out-of-order `step` values passes validation, and the renderer (§3 F3 iterates columns 0..maxStep) and step-through silently mis-order gates, which can read as "wrong circuit" with no error.
**Suggested fix:** Add "`step` values are non-negative and non-decreasing across `gates[]` (and contiguous from 0)" to the §1.1 loader constraints and to Task-002's unit-test requirement.

### [MINOR] Independent-validator parity: CI checks exported QASM against Qiskit but golden state vectors are self-generated
**Problem:** The QASM path is correctly validated by an independent parser (§2.9, Task-008), but the §7 golden state vectors are produced and checked by the same library (`quantastica/quantum-circuit`) they are meant to guard, so a library bug in state-vector math is invisible to its own golden test.
**Impact:** The simulation half of the HLD MAJOR-3 SPOF mitigation is circular — a wrong gate matrix in the library would be baked into the "expected" vector and never flagged, exactly the failure the independent-validator pattern elsewhere exists to prevent.
**Suggested fix:** Require Task-006's golden state vectors to be generated once by an independent simulator (Qiskit) and committed as fixed values, so the shipped library is checked against them rather than against itself.

## Categories with no findings
- **Scale gaps:** no issues — client-side SPA, 12/24 caps enforced in one place (§2.5), static hosting scales trivially; correctly handled.
- **Future extensibility:** no issues — own `CircuitModel` + `schemaVersion` + migration path and the single `lib-adapter.ts` swap point keep the library replaceable and the file format stable.
- **Failure modes:** no issues — degraded mode (KaTeX/library load failure), typed `LoadError`, newer-schema rejection, and 256 KB / sim-cap guards are concrete and testable.
- **Security gaps:** no issues — loader treats the file as the only untrusted input, validates size/schema/bounds, never `eval`s, and never invokes the simulator above 12 qubits (§1.4, §4.3, Task-011); no PII, no backend.
- **Missing NFRs:** no issues — latency p95, sim bound, offline precache, and correctness all carry concrete numbers and a test owner (§7).
- **HLD-decision fidelity:** no issues — pure client-side SPA, `quantastica/quantum-circuit` + thin in-house SVG wrapper, independent QASM parser, 12/24 caps, Grover |111⟩ default with a changeable target (never forced), and inline-math + external "Learn more" link are all honored without re-opening any LOCKED decision.
