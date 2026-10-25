# Golden State Vectors - Test Fixtures

## Purpose
These golden state vectors provide INDEPENDENT verification of the quantum-circuit library's simulation results, as required by LLD §7 and HLD MAJOR-3.

## Generation Method
**Pure Python analytic calculation** using explicit gate matrix definitions.

The state vectors were computed using:
- Explicit 2×2 gate matrices (H, X, Z)
- Tensor product operations for multi-qubit systems
- Matrix-vector multiplication for state evolution
- NO quantum computing libraries (no Qiskit, no quantastica/quantum-circuit)

This ensures the golden vectors are truly independent of the production library being tested.

## Generator Script
`../../generate_golden_states.py` - Can be re-run to regenerate fixtures if needed.

## Verification
- **Grover-3**: Final |111⟩ amplitude = -0.883883 (magnitude 0.88, probability 0.78)
- **Bell**: Creates (|00⟩ + |11⟩)/√2 entangled state
- **GHZ**: Creates (|000⟩ + |111⟩)/√2 three-qubit entangled state

## Test Usage
The simulator tests (`simulator.test.ts`) compare the quantum-circuit library's output against these fixtures to detect:
- Incorrect gate implementations
- Wrong state evolution
- Breaking library updates

This mirrors the QASM validation approach (independent OpenQASM parser) and satisfies the SPOF mitigation requirement.
