<!-- iteration: FINAL -->
# Quantum Circuit Builder — Requirements

## Vision
A web app where a user types a quantum algorithm in plain English and the app draws the matching quantum circuit. The user can see the gates laid out on qubit wires, export the circuit to OpenQASM 2.0, and save named circuits for later.

## Success criteria
- Typing **"Grover's algorithm for 3 qubits"** draws the correct circuit (correct qubit count, correct gate sequence for 3-qubit Grover: Hadamard layer → oracle → diffusion).
- The **Export** button produces a text file that parses as valid OpenQASM 2.0 (verified by a QASM 2.0 parser with zero errors).
- A circuit saved by download reloads from its file with the same gates in the same order 100% of the time.
- The plain-English parser correctly maps at least the algorithms listed in Phase 1 and Phase 2 (named in each phase below).

## User personas
| Persona | Who they are | What they need |
|---|---|---|
| Student | Learning quantum computing | Type an algorithm name, see the circuit, understand the gate layout |
| Educator | Teaching a course | Build example circuits fast, export to QASM for other tools |
| Researcher / hobbyist | Prototyping | Describe a circuit in words, get valid QASM to run on a simulator |

## Feature list
| # | Feature | Description | User value | Acceptance criteria |
|---|---|---|---|---|
| 1 | Text input box | A box to type the algorithm in plain English | Entry point; no coding needed | Accepts free text; a "Build" action triggers parsing; empty input shows a clear prompt, not an error |
| 2 | Plain-English parser | Maps the typed text to a known algorithm + qubit count | Turns words into a circuit | Recognizes the supported algorithms; unknown input returns a clear "not recognized" message naming what IS supported |
| 3 | Visual circuit | Draws qubit wires (horizontal lines) with gate boxes and multi-qubit connectors in time order | See and verify the circuit | One wire per qubit; gates render left-to-right in execution order; single-, two-, and controlled-gate shapes are visually distinct |
| 4 | Export to OpenQASM 2.0 | Button that outputs the circuit as OpenQASM 2.0 text | Use the circuit in real tools | Output begins `OPENQASM 2.0;`, includes `qreg`, and parses with zero errors in a QASM 2.0 parser |
| 5 | Save by download | Save a circuit by downloading it as a file (and loading that file back in). No accounts or server storage for now | Keep work without a backend | A "Download" action produces a file holding the full circuit; loading that file back reproduces the exact gate sequence |
| 6 | Interactive explanations | Alongside the circuit, show a plain-English explanation of what the algorithm does and the math behind it (gate matrices, state after each step), presented interactively — e.g. step through gates and see the math update. Deeper math (derivations, proofs) is NOT shown inline; instead link out to an external reference to keep the page clean | Learn, not just look | Every supported algorithm has an explanation; math renders readably (matrices, kets); stepping through the circuit updates the shown state step by step; a "Learn more" link points to deeper external material |

## Phased delivery plan

### Phase 1 — MVP
Prove the full path end to end on one algorithm.
- Feature 1: Text input box.
- Feature 2: Parser — supports **Grover's algorithm for 3 qubits** (the headline success case) plus **Bell state (2 qubits)** as a simple second case.
- Feature 3: Visual circuit — single-qubit gates (H, X, Z) and the two-qubit CNOT.
- Feature 4: Export to OpenQASM 2.0.
- Feature 6 (basic): a plain-English text explanation of the drawn algorithm — no math yet.

**Done when:** typing "Grover's algorithm for 3 qubits" draws the correct circuit, shows a short text explanation, AND its export parses as valid OpenQASM 2.0.

### Phase 2 — Save & more algorithms
Make it reusable and widen coverage.
- Feature 5: Save by download (download a circuit to a file; load it back).
- Parser additions: **Deutsch–Jozsa**, **GHZ state (3 qubits)**, **Grover for 2 qubits**.
- Visual circuit additions: controlled-Z, Toffoli (CCX), multi-control connectors.
- Feature 6 (full): the math behind each algorithm — gate matrices and the quantum state after each step — plus interactive step-through that updates the shown state gate by gate.

**Done when:** a user can build, name, save, and reload any Phase 1 or Phase 2 algorithm with identical gates on reload, AND step through its gates to see the math and state update at each step.

### Phase 3 — Flexibility & polish
Reduce reliance on a fixed algorithm list.
- Parser: parameterized qubit counts ("Grover for N qubits") and gate-by-gate phrasing ("Hadamard on qubit 0, then CNOT 0 to 1").
- Measurement gates and classical registers in both the diagram and the export.
- Import OpenQASM 2.0 back into a diagram.

**Done when:** a user can describe a circuit gate by gate and round-trip it (build → export → import) with no loss.

## Out of scope (for now)
- OpenQASM 3.0 and other formats.
- Running or simulating the circuit (no results, no state vectors).
- Circuit optimization or gate reduction.
- Accounts, login, multi-user sharing, cloud sync (saves are local for Phase 2).
- Natural-language understanding beyond the named algorithms and the Phase 3 gate-by-gate phrasing — no open-ended "invent an algorithm from a goal".
- Noise models, error correction, hardware backends.

## Open questions — RESOLVED
1. **Saving** — DECIDED: no server storage for now. The user saves by downloading the circuit to a file and can load that file back. Accounts and server-side save stay out of scope.
2. **"Grover's algorithm" oracle** — DECIDED: assume the user does not know the internals. Use a sensible default target state (|111⟩ for 3 qubits) and, where options exist, explain them in the UI so the user can change the target if they want. Never force the user to supply the oracle.
3. **Drawing / circuit library** — DEFERRED TO ENGINEERING: if good open-source quantum-circuit libraries exist, the HLD/engineering team decides the best approach — download and use a library, call a live API, or draw it in-house. They should analyze the pros, cons, and options and recommend one.
4. **Supported browsers / mobile** — desktop web first; mobile is not a Phase 1–2 requirement.
5. **Math depth for explanations** — DECIDED: inline shows gate matrices and per-step state only. Derivations and proofs are not rendered inline; a "Learn more" link points to external material.

## FINAL
Locked after 3 review rounds. No further changes without an explicit Director override.
