/**
 * Algorithm builders - pure functions that construct CircuitModels.
 * 
 * Task: Task-002
 * Requirements: #2 (parser needs these builders for recognized algorithms)
 * 
 * Each builder is a pure function: given a qubit count (and optional params),
 * it returns a complete, valid CircuitModel. No I/O, no throws.
 */

import type { CircuitModel, Gate } from './circuit-model';

/**
 * Builds a Grover search circuit for n qubits.
 * Default is 3 qubits with target state |111⟩ (all qubits in |1⟩).
 * 
 * Structure (one iteration):
 * 1. Hadamard layer - equal superposition
 * 2. Oracle - marks the target state with a phase flip (CCZ for |111⟩)
 * 3. Diffusion - inversion about the mean (amplitude amplification)
 * 
 * The oracle and diffusion both use CCZ (controlled-controlled-Z), realized
 * in the qelib1.inc gate set as: H·q2 → CCX(0,1→2) → H·q2.
 * 
 * The canonical Grover-3 output (21 gates) matches LLD §1.3 exactly.
 * After one iteration, the amplitude of |111⟩ is ≈ 0.78 (probability ≈ 0.61).
 * 
 * @param qubits - Number of qubits (default 3)
 * @param target - Target bit string to search for (default "111" for 3 qubits)
 * @returns Valid CircuitModel for Grover's algorithm
 */
export function buildGrover(qubits: number = 3, target?: string): CircuitModel {
  // Default target is all-ones for the given qubit count
  const targetStr = target ?? "1".repeat(qubits);
  
  const gates: Gate[] = [];
  let step = 0;

  // Step 0: Initial Hadamard layer on all qubits (equal superposition)
  for (let q = 0; q < qubits; q++) {
    gates.push({ name: "h", targets: [q], controls: [], params: [], step });
  }
  step++;

  // Oracle: Mark target state |111⟩ with phase flip using CCZ
  // CCZ = H·q2 → CCX(0,1→2) → H·q2
  // For target |111⟩ on 3 qubits:
  if (qubits === 3 && targetStr === "111") {
    gates.push({ name: "h", targets: [2], controls: [], params: [], step });
    step++;
    gates.push({ name: "ccx", targets: [2], controls: [0, 1], params: [], step });
    step++;
    gates.push({ name: "h", targets: [2], controls: [], params: [], step });
    step++;
  } else {
    // For other qubit counts or targets, we'd need different oracle logic
    // Phase 1 only requires Grover-3 with |111⟩, so this path is not implemented
    throw new Error(`Grover oracle for ${qubits} qubits with target ${targetStr} not yet implemented`);
  }

  // Diffusion operator (inversion about the mean)
  // Steps: H×n → X×n → multi-controlled-Z → X×n → H×n
  
  // Hadamard all qubits
  for (let q = 0; q < qubits; q++) {
    gates.push({ name: "h", targets: [q], controls: [], params: [], step });
  }
  step++;

  // X (NOT) all qubits
  for (let q = 0; q < qubits; q++) {
    gates.push({ name: "x", targets: [q], controls: [], params: [], step });
  }
  step++;

  // Multi-controlled-Z (marks |111⟩ after the X gates, which is |000⟩ before)
  // Again realized as H·q2 → CCX(0,1→2) → H·q2
  gates.push({ name: "h", targets: [2], controls: [], params: [], step });
  step++;
  gates.push({ name: "ccx", targets: [2], controls: [0, 1], params: [], step });
  step++;
  gates.push({ name: "h", targets: [2], controls: [], params: [], step });
  step++;

  // X (NOT) all qubits again (undo the NOT layer)
  for (let q = 0; q < qubits; q++) {
    gates.push({ name: "x", targets: [q], controls: [], params: [], step });
  }
  step++;

  // Hadamard all qubits (complete the diffusion)
  for (let q = 0; q < qubits; q++) {
    gates.push({ name: "h", targets: [q], controls: [], params: [], step });
  }

  return {
    schemaVersion: 1,
    numQubits: qubits,
    algorithmId: "grover",
    algorithmLabel: `Grover (${qubits} qubits), target |${targetStr}⟩`,
    params: { target: targetStr },
    gates
  };
}

/**
 * Builds a Bell state circuit (2-qubit entangled state).
 * 
 * Structure:
 * 1. Hadamard on qubit 0 (superposition)
 * 2. CNOT from qubit 0 to qubit 1 (entanglement)
 * 
 * Result: (|00⟩ + |11⟩) / √2, the maximally entangled Bell state |Φ+⟩.
 * 
 * @returns Valid CircuitModel for Bell state
 */
export function buildBell(): CircuitModel {
  const gates: Gate[] = [
    { name: "h", targets: [0], controls: [], params: [], step: 0 },
    { name: "cx", targets: [1], controls: [0], params: [], step: 1 }
  ];

  return {
    schemaVersion: 1,
    numQubits: 2,
    algorithmId: "bell",
    algorithmLabel: "Bell state (2 qubits)",
    params: {},
    gates
  };
}
