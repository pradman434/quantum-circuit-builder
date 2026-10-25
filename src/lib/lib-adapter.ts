/**
 * Library adapter - the ONLY file importing quantastica/quantum-circuit.
 * 
 * Task: Task-002A
 * Requirements: #3 (rendering), #4 (export), #6 (simulation)
 * 
 * This module isolates the third-party library behind our own interfaces,
 * satisfying the HLD SPOF isolation requirement. All other modules
 * (exporter, renderer, simulator) reach the library only through these functions.
 * 
 * Swapping the circuit library means rewriting only this file.
 */

import QuantumCircuit from 'quantum-circuit';
import type { QuantumCircuit as QuantumCircuitType } from 'quantum-circuit';
import type { CircuitModel, Gate } from '../model/circuit-model';

/**
 * Converts our CircuitModel to the library's QuantumCircuit object.
 * 
 * Maps our gate vocabulary to the library's gate names and structure.
 * The library uses 0-indexed qubits like we do.
 * 
 * @param circuit - Our canonical circuit model
 * @returns QuantumCircuit object ready for library operations
 */
export function toLib(circuit: CircuitModel): QuantumCircuitType {
  const qc = new QuantumCircuit(circuit.numQubits);

  // Group gates by step to maintain time ordering
  const stepGroups = new Map<number, Gate[]>();
  for (const gate of circuit.gates) {
    if (!stepGroups.has(gate.step)) {
      stepGroups.set(gate.step, []);
    }
    stepGroups.get(gate.step)!.push(gate);
  }

  // Add gates in step order
  const sortedSteps = Array.from(stepGroups.keys()).sort((a, b) => a - b);
  for (const step of sortedSteps) {
    const gates = stepGroups.get(step)!;
    for (const gate of gates) {
      // Map our gate names to library gate names
      // The library expects gate names as strings and qubit indices
      switch (gate.name) {
        case 'h':
          qc.addGate('h', -1, gate.targets[0]);
          break;
        case 'x':
          qc.addGate('x', -1, gate.targets[0]);
          break;
        case 'y':
          qc.addGate('y', -1, gate.targets[0]);
          break;
        case 'z':
          qc.addGate('z', -1, gate.targets[0]);
          break;
        case 'cx':
          // CNOT: control first, then target
          qc.addGate('cx', -1, [gate.controls[0], gate.targets[0]]);
          break;
        case 'ccx':
          // Toffoli: two controls, then target
          qc.addGate('ccx', -1, [gate.controls[0], gate.controls[1], gate.targets[0]]);
          break;
        case 'cz':
          qc.addGate('cz', -1, [gate.controls[0], gate.targets[0]]);
          break;
        case 'measure':
          // Measurement - Phase 3
          qc.addMeasure(gate.targets[0], gate.targets[0].toString());
          break;
        default:
          throw new Error(`Unsupported gate in toLib: ${gate.name}`);
      }
    }
  }

  return qc;
}

/**
 * Converts a library QuantumCircuit object back to our CircuitModel.
 * 
 * Note: The library's internal gate structure is complex (multi-row spanning).
 * This is primarily for QASM import (Phase 3). For now, return a minimal model.
 * 
 * @param qc - Library's QuantumCircuit object
 * @returns Our canonical circuit model (simplified)
 */
export function fromLib(qc: QuantumCircuitType): CircuitModel {
  // For Phase 1, we don't actually need full round-trip from lib format
  // This will be properly implemented in Phase 3 (QASM import)
  
  // Return a minimal valid model
  return {
    schemaVersion: 1,
    numQubits: qc.numQubits,
    algorithmId: 'imported',
    algorithmLabel: 'Imported circuit',
    params: {},
    gates: [] // Will be populated in Phase 3
  };
}

/**
 * Exports a library QuantumCircuit to OpenQASM 2.0 string.
 * 
 * The library provides its own QASM export. We use it directly,
 * then the exporter module can post-process if needed.
 * 
 * @param qc - Library's QuantumCircuit object
 * @returns OpenQASM 2.0 string
 */
export function libToQasm(qc: QuantumCircuitType): string {
  return qc.exportQASM();
}

/**
 * Computes the state vector at each step of the circuit.
 * 
 * Strategy: For each step, build a fresh partial circuit from the original CircuitModel
 * (not from the library's internal structure), including only gates up to that step,
 * then run() and extract the state. This avoids dealing with the library's complex
 * internal gate storage.
 * 
 * Returns an array where index i is the state after step i.
 * Index 0 is the initial |0...0⟩ state.
 * 
 * NOTE: The quantastica/quantum-circuit library stores state amplitudes as
 * objects with {re, im} fields, NOT as [real, imag] arrays.
 * 
 * IMPORTANT: This function is meant to be called from simulator.ts which has access
 * to the original CircuitModel. To make this work, we need to pass the CircuitModel
 * alongside the QuantumCircuit, OR refactor to build partial circuits in toLib.
 * 
 * For now, we'll extract step information from the library circuit itself by
 * running it incrementally using a different strategy: run the FULL circuit once,
 * then for each earlier step, rebuild from scratch with gates filtered by step.
 * 
 * @param qc - Library's QuantumCircuit object (the FULL circuit)
 * @param circuit - Our CircuitModel (needed to filter by step)
 * @returns Array of state vectors (complex amplitudes)
 */
function libStateVectorFromModel(_qc: QuantumCircuitType, circuit: CircuitModel): Array<{ basis: string; re: number; im: number }[]> {
  const steps: Array<{ basis: string; re: number; im: number }[]> = [];
  const numQubits = circuit.numQubits;
  const numStates = 1 << numQubits; // 2^numQubits

  // Helper: extract state from a quantum circuit
  const extractState = (circuit: QuantumCircuitType): { basis: string; re: number; im: number }[] => {
    const stateArray: { basis: string; re: number; im: number }[] = [];
    const state = circuit.state;
    
    for (let i = 0; i < numStates; i++) {
      const basis = i.toString(2).padStart(numQubits, '0');
      const amplitude = state[i];
      
      if (amplitude && typeof amplitude === 'object' && 're' in amplitude && 'im' in amplitude) {
        stateArray.push({
          basis,
          re: amplitude.re,
          im: amplitude.im
        });
      } else {
        // If state is missing or malformed, assume zero amplitude
        stateArray.push({
          basis,
          re: 0,
          im: 0
        });
      }
    }
    
    return stateArray;
  };

  // Initial state |0...0⟩ (before any gates)
  const initialState: { basis: string; re: number; im: number }[] = [];
  for (let i = 0; i < numStates; i++) {
    const basis = i.toString(2).padStart(numQubits, '0');
    initialState.push({
      basis,
      re: i === 0 ? 1.0 : 0.0,
      im: 0.0
    });
  }
  steps.push(initialState);

  // Find the maximum step index
  const maxStep = Math.max(...circuit.gates.map(g => g.step));

  // For each step from 0 to maxStep, build a partial circuit and simulate
  for (let targetStep = 0; targetStep <= maxStep; targetStep++) {
    // Build a partial CircuitModel with only gates up to targetStep
    const partialModel: CircuitModel = {
      ...circuit,
      gates: circuit.gates.filter(g => g.step <= targetStep)
    };

    // Convert to library format and run
    const partialQC = toLib(partialModel);
    partialQC.run();

    // Extract and store state
    steps.push(extractState(partialQC));
  }

  return steps;
}

/**
 * Public API: libStateVector that accepts BOTH the library circuit and our model.
 * This is what simulator.ts will call.
 */
export function libStateVector(qc: QuantumCircuitType, circuit: CircuitModel): Array<{ basis: string; re: number; im: number }[]> {
  return libStateVectorFromModel(qc, circuit);
}
