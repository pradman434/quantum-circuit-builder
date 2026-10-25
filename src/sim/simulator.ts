/**
 * Step-by-step quantum state simulator.
 * 
 * Task: Task-006
 * Requirements: #6 (interactive explanations - math behind each algorithm)
 * 
 * This module provides the stepStates() function that computes the quantum state
 * vector after each time-step in a circuit, enabling the interactive step-through
 * feature in the explanation panel.
 * 
 * CRITICAL: This is the ONLY module that enforces the 12-qubit simulation cap at runtime.
 * When numQubits > 12, returns {unavailable: true} and NEVER allocates 2^n amplitudes
 * or calls the library simulation, preventing memory exhaustion.
 * 
 * The 12-qubit cap (2^12 = 4096 amplitudes) is the hard limit for state-vector simulation
 * in the browser. Above this, the circuit can still be drawn and exported to QASM, but
 * the step-by-step state view is unavailable.
 */

import { toLib, libStateVector } from '../lib/lib-adapter.js';
import type { CircuitModel } from '../model/circuit-model.js';

/**
 * A quantum state at one time-step.
 * 
 * Contains the full state vector: one complex amplitude per basis state.
 * For n qubits, there are 2^n basis states, indexed 0 to 2^n - 1,
 * where each index corresponds to a binary string (e.g., index 5 = |101⟩ for n=3).
 */
export interface StepState {
  /** Time-step index (0 = initial state |0...0⟩, 1 = after first column, etc.) */
  step: number;
  
  /** 
   * State vector amplitudes in computational basis.
   * Length = 2^numQubits.
   * Each entry is {basis: "01...", re: real_part, im: imaginary_part}.
   */
  amplitudes: Array<{ basis: string; re: number; im: number }>;
}

/**
 * Result type for stepStates().
 * Either an array of state vectors (one per step), or unavailable with a reason.
 */
export type SimulationResult =
  | StepState[]
  | { unavailable: true; reason: string };

/**
 * Hard simulation cap: maximum number of qubits for state-vector simulation.
 * 
 * Above this limit, the state vector size (2^n complex numbers) becomes prohibitively
 * large for in-browser computation. For numQubits > 12, stepStates() returns
 * {unavailable: true} and never attempts to allocate or compute the state.
 * 
 * This cap is enforced ONLY in this module. The rest of the application (parser,
 * renderer, exporter) works fine with larger circuits up to the 24-qubit draw ceiling.
 */
const MAX_SIMULATION_QUBITS = 12;

/**
 * Simulates a quantum circuit step by step, returning the state vector after each time-step.
 * 
 * Returns one StepState per column in the circuit, plus the initial |0...0⟩ state at index 0.
 * For a circuit with maxStep = N, the returned array has length N + 2:
 *   - states[0]: initial state (before any gates)
 *   - states[i]: state after step i-1 (for i = 1 to N+1)
 * 
 * **Simulation cap enforcement:**
 * If circuit.numQubits > MAX_SIMULATION_QUBITS, returns {unavailable: true, reason}
 * WITHOUT allocating 2^n memory or invoking the library simulator.
 * This is the ONLY place the cap is checked at runtime.
 * 
 * **Pre-conditions:**
 * - circuit is a valid CircuitModel (validated by circuit-model.ts)
 * 
 * **Post-conditions (success path):**
 * - Returns StepState[] where each state has 2^numQubits amplitudes
 * - Amplitudes are normalized (sum of |amplitude|^2 = 1.0)
 * - step indices are 0, 1, 2, ..., maxStep+1
 * 
 * **Post-conditions (unavailable path):**
 * - Returns {unavailable: true, reason} for numQubits > 12
 * - No memory allocation proportional to 2^numQubits occurs
 * 
 * @param circuit - The quantum circuit to simulate
 * @returns Array of state vectors (one per step), or {unavailable: true}
 */
export function stepStates(circuit: CircuitModel): SimulationResult {
  // Enforce the 12-qubit cap BEFORE any allocation or library call.
  // This is the ONLY place this check happens in the entire codebase.
  if (circuit.numQubits > MAX_SIMULATION_QUBITS) {
    return {
      unavailable: true,
      reason: `State vector simulation unavailable above ${MAX_SIMULATION_QUBITS} qubits (circuit has ${circuit.numQubits} qubits)`
    };
  }

  // Circuit is within the simulation cap. Convert to library format and simulate.
  try {
    const qc = toLib(circuit);
    const rawStates = libStateVector(qc, circuit);

    // Convert library output to our StepState format
    const states: StepState[] = rawStates.map((amplitudes, index) => ({
      step: index,
      amplitudes
    }));

    return states;
  } catch (error) {
    // If the library simulation fails for any reason, return unavailable.
    // This could happen if the circuit contains unsupported gates or
    // the library encounters an internal error.
    const message = error instanceof Error ? error.message : String(error);
    return {
      unavailable: true,
      reason: `Simulation failed: ${message}`
    };
  }
}
