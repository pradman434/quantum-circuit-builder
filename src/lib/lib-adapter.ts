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
export function toLib(circuit: CircuitModel): QuantumCircuit {
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
export function fromLib(qc: QuantumCircuit): CircuitModel {
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
export function libToQasm(qc: QuantumCircuit): string {
  return qc.exportQASM();
}

/**
 * Computes the state vector at each step of the circuit.
 * 
 * The library can run statevector simulation. We execute the circuit
 * incrementally to get the state after each column (step).
 * 
 * Returns an array where index i is the state after step i.
 * Index 0 is the initial |0...0⟩ state.
 * 
 * @param qc - Library's QuantumCircuit object
 * @returns Array of state vectors (complex amplitudes)
 */
export function libStateVector(qc: QuantumCircuit): Array<{ basis: string; re: number; im: number }[]> {
  const steps: Array<{ basis: string; re: number; im: number }[]> = [];
  const numQubits = qc.numQubits;
  const numStates = 1 << numQubits; // 2^numQubits

  // Initial state |0...0⟩
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

  // Run simulation step by step
  // The library's statevector is in qc.state after calling run()
  // We need to clone and run incrementally
  for (let col = 0; col < qc.numCols(); col++) {
    const partialQC = new QuantumCircuit(numQubits);
    
    // Copy gates up to and including this column
    for (let c = 0; c <= col; c++) {
      const column = qc.gates[c];
      if (!column) continue;
      for (let qubit = 0; qubit < numQubits; qubit++) {
        const gateData = column[qubit];
        if (gateData) {
          // Re-add this gate to the partial circuit
          // Use the library's internal structure
          if (!partialQC.gates[c]) {
            partialQC.gates[c] = {};
          }
          partialQC.gates[c][qubit] = JSON.parse(JSON.stringify(gateData));
        }
      }
    }

    // Run simulation on this partial circuit
    partialQC.run();
    
    // Extract state vector
    const stateArray: { basis: string; re: number; im: number }[] = [];
    const state = partialQC.state;
    for (let i = 0; i < numStates; i++) {
      const basis = i.toString(2).padStart(numQubits, '0');
      const amplitude = state[i] || [0, 0]; // [real, imag]
      stateArray.push({
        basis,
        re: amplitude[0],
        im: amplitude[1]
      });
    }
    steps.push(stateArray);
  }

  return steps;
}
