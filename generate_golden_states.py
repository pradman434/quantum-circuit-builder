#!/usr/bin/env python3
"""
Independent quantum state vector calculator using pure Python.
This generates golden state vectors WITHOUT using the quantum-circuit library,
ensuring independence as required by LLD §7.

Uses explicit gate matrix definitions and tensor product operations.
"""

import json
import math
from typing import List, Tuple, Dict

# Type aliases
Complex = Tuple[float, float]  # (real, imaginary)
StateVector = List[Complex]
Matrix = List[List[Complex]]


def complex_mul(a: Complex, b: Complex) -> Complex:
    """Multiply two complex numbers."""
    re = a[0] * b[0] - a[1] * b[1]
    im = a[0] * b[1] + a[1] * b[0]
    return (re, im)


def complex_add(a: Complex, b: Complex) -> Complex:
    """Add two complex numbers."""
    return (a[0] + b[0], a[1] + b[1])


def matrix_vector_mul(matrix: Matrix, vector: StateVector) -> StateVector:
    """Multiply a matrix by a vector."""
    result = []
    for row in matrix:
        val = (0.0, 0.0)
        for i, coeff in enumerate(row):
            val = complex_add(val, complex_mul(coeff, vector[i]))
        result.append(val)
    return result


def tensor_product(a: Matrix, b: Matrix) -> Matrix:
    """Compute tensor product of two matrices."""
    n = len(a)
    m = len(b)
    result = [[None for _ in range(n * m)] for _ in range(n * m)]
    
    for i in range(n):
        for j in range(n):
            for k in range(m):
                for l in range(m):
                    result[i * m + k][j * m + l] = complex_mul(a[i][j], b[k][l])
    
    return result


def identity_matrix(n: int) -> Matrix:
    """Create an n×n identity matrix."""
    return [[(1.0, 0.0) if i == j else (0.0, 0.0) for j in range(n)] for i in range(n)]


# Gate definitions
SQRT_2_INV = 1.0 / math.sqrt(2)

# Single-qubit gates (2×2 matrices)
H_GATE: Matrix = [
    [(SQRT_2_INV, 0.0), (SQRT_2_INV, 0.0)],
    [(SQRT_2_INV, 0.0), (-SQRT_2_INV, 0.0)]
]

X_GATE: Matrix = [
    [(0.0, 0.0), (1.0, 0.0)],
    [(1.0, 0.0), (0.0, 0.0)]
]

Z_GATE: Matrix = [
    [(1.0, 0.0), (0.0, 0.0)],
    [(0.0, 0.0), (-1.0, 0.0)]
]

I_GATE: Matrix = identity_matrix(2)


def single_qubit_gate(gate: Matrix, qubit: int, num_qubits: int) -> Matrix:
    """Apply a single-qubit gate to a specific qubit in an n-qubit system."""
    result = I_GATE if qubit > 0 else gate
    
    for i in range(1, num_qubits):
        if i == qubit:
            result = tensor_product(result, gate)
        else:
            result = tensor_product(result, I_GATE)
    
    return result


def controlled_gate(control: int, target: int, gate: Matrix, num_qubits: int) -> Matrix:
    """
    Apply a controlled gate (e.g., CNOT, CZ).
    Control qubit: applies gate to target only if control is |1⟩.
    """
    n = 2 ** num_qubits
    result = [[complex_add((0.0, 0.0), (0.0, 0.0)) for _ in range(n)] for _ in range(n)]
    
    for i in range(n):
        # Check if control qubit is 1
        control_bit = (i >> (num_qubits - 1 - control)) & 1
        
        if control_bit == 0:
            # Control is 0: identity (copy input to output)
            result[i][i] = (1.0, 0.0)
        else:
            # Control is 1: apply gate to target qubit
            target_bit = (i >> (num_qubits - 1 - target)) & 1
            # Flip target bit
            new_i = i ^ (1 << (num_qubits - 1 - target))
            
            # For X gate: swap amplitudes
            if gate == X_GATE:
                result[new_i][i] = (1.0, 0.0)
            # For Z gate: phase flip if target is 1
            elif gate == Z_GATE:
                if target_bit == 1:
                    result[i][i] = (-1.0, 0.0)
                else:
                    result[i][i] = (1.0, 0.0)
    
    return result


def ccx_gate(control1: int, control2: int, target: int, num_qubits: int) -> Matrix:
    """
    Toffoli (CCX) gate: X on target if both controls are |1⟩.
    """
    n = 2 ** num_qubits
    result = [[complex_add((0.0, 0.0), (0.0, 0.0)) for _ in range(n)] for _ in range(n)]
    
    for i in range(n):
        c1_bit = (i >> (num_qubits - 1 - control1)) & 1
        c2_bit = (i >> (num_qubits - 1 - control2)) & 1
        
        if c1_bit == 1 and c2_bit == 1:
            # Both controls are 1: flip target
            new_i = i ^ (1 << (num_qubits - 1 - target))
            result[new_i][i] = (1.0, 0.0)
        else:
            # At least one control is 0: identity
            result[i][i] = (1.0, 0.0)
    
    return result


def initial_state(num_qubits: int) -> StateVector:
    """Create initial |0...0⟩ state."""
    n = 2 ** num_qubits
    state = [(0.0, 0.0) for _ in range(n)]
    state[0] = (1.0, 0.0)
    return state


def format_state(state: StateVector, num_qubits: int) -> List[Dict]:
    """Format state vector for JSON output."""
    result = []
    for i, (re, im) in enumerate(state):
        basis = format(i, f'0{num_qubits}b')
        result.append({"basis": basis, "re": round(re, 10), "im": round(im, 10)})
    return result


def simulate_grover_3() -> List[List[Dict]]:
    """
    Simulate Grover's algorithm for 3 qubits, target |111⟩.
    
    Gate sequence from LLD §1.3:
    - Step 0: H⊗H⊗H (Hadamard layer)
    - Steps 1-3: Oracle (H·q2, CCX(0,1→2), H·q2)
    - Steps 4-10: Diffusion (H⊗3, X⊗3, CCZ, X⊗3, H⊗3)
    
    CCZ is implemented as H·q2, CCX(0,1→2), H·q2 (same as oracle).
    """
    num_qubits = 3
    states = []
    
    # Initial state
    state = initial_state(num_qubits)
    states.append(format_state(state, num_qubits))
    
    # Step 0: H⊗H⊗H
    h0 = single_qubit_gate(H_GATE, 0, num_qubits)
    state = matrix_vector_mul(h0, state)
    h1 = single_qubit_gate(H_GATE, 1, num_qubits)
    state = matrix_vector_mul(h1, state)
    h2 = single_qubit_gate(H_GATE, 2, num_qubits)
    state = matrix_vector_mul(h2, state)
    states.append(format_state(state, num_qubits))
    
    # Step 1: H on q2 (oracle start)
    h2 = single_qubit_gate(H_GATE, 2, num_qubits)
    state = matrix_vector_mul(h2, state)
    states.append(format_state(state, num_qubits))
    
    # Step 2: CCX(0,1→2) (oracle middle)
    ccx = ccx_gate(0, 1, 2, num_qubits)
    state = matrix_vector_mul(ccx, state)
    states.append(format_state(state, num_qubits))
    
    # Step 3: H on q2 (oracle end)
    h2 = single_qubit_gate(H_GATE, 2, num_qubits)
    state = matrix_vector_mul(h2, state)
    states.append(format_state(state, num_qubits))
    
    # Step 4: H⊗H⊗H (diffusion start)
    h0 = single_qubit_gate(H_GATE, 0, num_qubits)
    state = matrix_vector_mul(h0, state)
    h1 = single_qubit_gate(H_GATE, 1, num_qubits)
    state = matrix_vector_mul(h1, state)
    h2 = single_qubit_gate(H_GATE, 2, num_qubits)
    state = matrix_vector_mul(h2, state)
    states.append(format_state(state, num_qubits))
    
    # Step 5: X⊗X⊗X
    x0 = single_qubit_gate(X_GATE, 0, num_qubits)
    state = matrix_vector_mul(x0, state)
    x1 = single_qubit_gate(X_GATE, 1, num_qubits)
    state = matrix_vector_mul(x1, state)
    x2 = single_qubit_gate(X_GATE, 2, num_qubits)
    state = matrix_vector_mul(x2, state)
    states.append(format_state(state, num_qubits))
    
    # Step 6: H on q2 (CCZ start)
    h2 = single_qubit_gate(H_GATE, 2, num_qubits)
    state = matrix_vector_mul(h2, state)
    states.append(format_state(state, num_qubits))
    
    # Step 7: CCX(0,1→2) (CCZ middle)
    ccx = ccx_gate(0, 1, 2, num_qubits)
    state = matrix_vector_mul(ccx, state)
    states.append(format_state(state, num_qubits))
    
    # Step 8: H on q2 (CCZ end)
    h2 = single_qubit_gate(H_GATE, 2, num_qubits)
    state = matrix_vector_mul(h2, state)
    states.append(format_state(state, num_qubits))
    
    # Step 9: X⊗X⊗X
    x0 = single_qubit_gate(X_GATE, 0, num_qubits)
    state = matrix_vector_mul(x0, state)
    x1 = single_qubit_gate(X_GATE, 1, num_qubits)
    state = matrix_vector_mul(x1, state)
    x2 = single_qubit_gate(X_GATE, 2, num_qubits)
    state = matrix_vector_mul(x2, state)
    states.append(format_state(state, num_qubits))
    
    # Step 10: H⊗H⊗H (diffusion end)
    h0 = single_qubit_gate(H_GATE, 0, num_qubits)
    state = matrix_vector_mul(h0, state)
    h1 = single_qubit_gate(H_GATE, 1, num_qubits)
    state = matrix_vector_mul(h1, state)
    h2 = single_qubit_gate(H_GATE, 2, num_qubits)
    state = matrix_vector_mul(h2, state)
    states.append(format_state(state, num_qubits))
    
    return states


def simulate_bell() -> List[List[Dict]]:
    """
    Simulate Bell state preparation: H on q0, CNOT(0→1).
    Creates the entangled state (|00⟩ + |11⟩) / √2.
    """
    num_qubits = 2
    states = []
    
    # Initial state
    state = initial_state(num_qubits)
    states.append(format_state(state, num_qubits))
    
    # Step 0: H on q0
    h0 = single_qubit_gate(H_GATE, 0, num_qubits)
    state = matrix_vector_mul(h0, state)
    states.append(format_state(state, num_qubits))
    
    # Step 1: CNOT(0→1)
    cx = controlled_gate(0, 1, X_GATE, num_qubits)
    state = matrix_vector_mul(cx, state)
    states.append(format_state(state, num_qubits))
    
    return states


def simulate_ghz() -> List[List[Dict]]:
    """
    Simulate GHZ state preparation for 3 qubits: H on q0, CNOT(0→1), CNOT(0→2).
    Creates the entangled state (|000⟩ + |111⟩) / √2.
    """
    num_qubits = 3
    states = []
    
    # Initial state
    state = initial_state(num_qubits)
    states.append(format_state(state, num_qubits))
    
    # Step 0: H on q0
    h0 = single_qubit_gate(H_GATE, 0, num_qubits)
    state = matrix_vector_mul(h0, state)
    states.append(format_state(state, num_qubits))
    
    # Step 1: CNOT(0→1)
    cx01 = controlled_gate(0, 1, X_GATE, num_qubits)
    state = matrix_vector_mul(cx01, state)
    states.append(format_state(state, num_qubits))
    
    # Step 2: CNOT(0→2)
    cx02 = controlled_gate(0, 2, X_GATE, num_qubits)
    state = matrix_vector_mul(cx02, state)
    states.append(format_state(state, num_qubits))
    
    return states


if __name__ == "__main__":
    print("Generating golden state vectors (independent analytic calculation)...")
    
    # Generate Grover-3
    print("  Grover-3...")
    grover_states = simulate_grover_3()
    print(f"    Final |111⟩ amplitude: {grover_states[-1][7]['re']:.6f}")  # Index 7 = |111⟩
    
    # Generate Bell
    print("  Bell...")
    bell_states = simulate_bell()
    
    # Generate GHZ
    print("  GHZ...")
    ghz_states = simulate_ghz()
    
    # Save to JSON files
    output = {
        "grover-3": grover_states,
        "bell": bell_states,
        "ghz": ghz_states
    }
    
    with open("src/sim/__tests__/fixtures/golden-states.json", "w") as f:
        json.dump(output, f, indent=2)
    
    print(f"\nGolden state vectors saved to src/sim/__tests__/fixtures/golden-states.json")
    print(f"Generated using: Pure Python analytic calculation (explicit gate matrices)")
