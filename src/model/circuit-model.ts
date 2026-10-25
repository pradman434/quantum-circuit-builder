/**
 * Core circuit model types for Quantum Circuit Builder.
 * 
 * Task: Task-002
 * Requirements: #1, #2, #3, #4 (circuit model, parser, rendering, export)
 * 
 * This file defines the canonical in-memory and persisted circuit structure
 * that all components (parser, renderer, exporter, simulator) consume.
 */

/**
 * Supported gate names. Phase 1 includes h, x, z, cx (CNOT), and ccx (Toffoli).
 * The ccx gate is required for Grover's 3-qubit oracle and diffusion.
 */
export type GateName =
  | "h"   // Hadamard
  | "x"   // Pauli-X (NOT)
  | "y"   // Pauli-Y
  | "z"   // Pauli-Z
  | "cx"  // CNOT (controlled-X)
  | "ccx" // Toffoli (controlled-controlled-X) - Phase 1 for Grover-3
  | "cz"  // Controlled-Z - Phase 2
  | "measure"; // Measurement - Phase 3

/**
 * A single quantum gate in a circuit.
 * 
 * @property name - Gate type from the GateName vocabulary
 * @property targets - Qubit indices the gate acts on (≥1 element)
 * @property controls - Control qubit indices (empty for uncontrolled gates)
 * @property params - Rotation angles or other parameters (empty for Phase 1-2 gates)
 * @property step - 0-based time-order index (column in the circuit diagram)
 */
export interface Gate {
  name: GateName;
  targets: number[];
  controls: number[];
  params: number[];
  step: number;
}

/**
 * Complete quantum circuit model - the canonical structure.
 * 
 * This is the single source of truth consumed by all components:
 * - Parser produces this
 * - Renderer draws from this
 * - Exporter converts this to QASM
 * - Simulator computes state vectors from this
 * - File loader validates and constructs this
 * 
 * Constraints (enforced by validator):
 * - numQubits: integer, 1 ≤ numQubits ≤ 24
 * - All target/control indices in [0, numQubits)
 * - Gate names in the GateName vocabulary
 * - Controls and targets are disjoint (no self-control)
 * - Gate steps are non-negative, non-decreasing, and contiguous from 0
 */
export interface CircuitModel {
  /** Schema version for forward compatibility. Bump on breaking changes. */
  schemaVersion: 1;
  
  /** Number of qubits. Draw/export ceiling = 24, simulation cap = 12. */
  numQubits: number;
  
  /** Stable algorithm identifier (e.g., "grover", "bell", "ghz") */
  algorithmId: string;
  
  /** Human-readable label (e.g., "Grover (3 qubits), target |111⟩") */
  algorithmLabel: string;
  
  /** Algorithm-specific parameters (not per-gate) */
  params: {
    /** Grover oracle target state, e.g., "111" */
    target?: string;
    [key: string]: string | number | undefined;
  };
  
  /** Ordered gate sequence. gates[i].step is monotonic non-decreasing. */
  gates: Gate[];
}

/**
 * Validation result type.
 */
export type ValidationResult =
  | { valid: true }
  | { valid: false; errors: string[] };

/**
 * Validates a CircuitModel against all constraints from LLD §1.1.
 * 
 * @param circuit - The circuit to validate
 * @returns ValidationResult with errors if invalid
 */
export function validateCircuit(circuit: CircuitModel): ValidationResult {
  const errors: string[] = [];

  // Validate schemaVersion
  if (circuit.schemaVersion !== 1) {
    errors.push(`Invalid schemaVersion: ${circuit.schemaVersion}, expected 1`);
  }

  // Validate numQubits
  if (!Number.isInteger(circuit.numQubits)) {
    errors.push(`numQubits must be an integer, got ${circuit.numQubits}`);
  } else if (circuit.numQubits < 1 || circuit.numQubits > 24) {
    errors.push(`numQubits must be in range [1, 24], got ${circuit.numQubits}`);
  }

  // Validate gates
  if (!Array.isArray(circuit.gates)) {
    errors.push('gates must be an array');
    return { valid: false, errors };
  }

  const validGateNames: GateName[] = ["h", "x", "y", "z", "cx", "ccx", "cz", "measure"];
  let prevStep = -1;
  const seenSteps = new Set<number>();

  circuit.gates.forEach((gate, idx) => {
    // Validate gate name
    if (!validGateNames.includes(gate.name)) {
      errors.push(`Gate ${idx}: unknown gate name "${gate.name}"`);
    }

    // Validate step: non-negative, non-decreasing
    if (!Number.isInteger(gate.step) || gate.step < 0) {
      errors.push(`Gate ${idx}: step must be non-negative integer, got ${gate.step}`);
    } else {
      if (gate.step < prevStep) {
        errors.push(`Gate ${idx}: step ${gate.step} is less than previous step ${prevStep} (must be non-decreasing)`);
      }
      prevStep = gate.step;
      seenSteps.add(gate.step);
    }

    // Validate targets
    if (!Array.isArray(gate.targets) || gate.targets.length === 0) {
      errors.push(`Gate ${idx}: targets must be non-empty array`);
    } else {
      gate.targets.forEach(t => {
        if (!Number.isInteger(t) || t < 0 || t >= circuit.numQubits) {
          errors.push(`Gate ${idx}: target ${t} out of range [0, ${circuit.numQubits})`);
        }
      });
    }

    // Validate controls
    if (!Array.isArray(gate.controls)) {
      errors.push(`Gate ${idx}: controls must be an array`);
    } else {
      gate.controls.forEach(c => {
        if (!Number.isInteger(c) || c < 0 || c >= circuit.numQubits) {
          errors.push(`Gate ${idx}: control ${c} out of range [0, ${circuit.numQubits})`);
        }
      });
    }

    // Validate controls and targets are disjoint
    const targetSet = new Set(gate.targets);
    const controlSet = new Set(gate.controls);
    const intersection = [...targetSet].filter(t => controlSet.has(t));
    if (intersection.length > 0) {
      errors.push(`Gate ${idx}: controls and targets overlap at qubits [${intersection}] (self-control forbidden)`);
    }

    // Validate params
    if (!Array.isArray(gate.params)) {
      errors.push(`Gate ${idx}: params must be an array`);
    }
  });

  // Validate steps are contiguous from 0
  if (circuit.gates.length > 0) {
    const maxStep = Math.max(...circuit.gates.map(g => g.step));
    const expectedSteps = Array.from({ length: maxStep + 1 }, (_, i) => i);
    const missingSteps = expectedSteps.filter(s => !seenSteps.has(s));
    if (missingSteps.length > 0) {
      errors.push(`Steps are not contiguous from 0: missing steps [${missingSteps}]`);
    }
  }

  return errors.length === 0 ? { valid: true } : { valid: false, errors };
}
