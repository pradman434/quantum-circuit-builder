/**
 * Unit tests for CircuitModel types, validators, and builders (Task-002).
 * 
 * Test requirements from task-002.md:
 * - Builders produce constraint-valid models
 * - Grover-3 builder output matches LLD §1.3 canonical fixture exactly
 * - Validator rejects out-of-range indices, unknown gates, self-control, non-contiguous steps
 */

import { describe, it, expect } from 'vitest';
import type { CircuitModel } from '../circuit-model';
import { validateCircuit } from '../circuit-model';
import { buildGrover, buildBell } from '../builders';

describe('validateCircuit', () => {
  it('accepts a valid minimal circuit', () => {
    const circuit: CircuitModel = {
      schemaVersion: 1,
      numQubits: 1,
      algorithmId: 'test',
      algorithmLabel: 'Test',
      params: {},
      gates: [{ name: 'h', targets: [0], controls: [], params: [], step: 0 }]
    };
    const result = validateCircuit(circuit);
    expect(result.valid).toBe(true);
  });

  it('rejects invalid schemaVersion', () => {
    const circuit = {
      schemaVersion: 999,
      numQubits: 1,
      algorithmId: 'test',
      algorithmLabel: 'Test',
      params: {},
      gates: []
    } as unknown as CircuitModel;
    const result = validateCircuit(circuit);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain('Invalid schemaVersion: 999, expected 1');
    }
  });

  it('rejects numQubits out of range', () => {
    const circuit = {
      schemaVersion: 1,
      numQubits: 0,
      algorithmId: 'test',
      algorithmLabel: 'Test',
      params: {},
      gates: []
    } as CircuitModel;
    const result = validateCircuit(circuit);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some(e => e.includes('numQubits must be in range [1, 24]'))).toBe(true);
    }
  });

  it('rejects target index out of range', () => {
    const circuit: CircuitModel = {
      schemaVersion: 1,
      numQubits: 2,
      algorithmId: 'test',
      algorithmLabel: 'Test',
      params: {},
      gates: [{ name: 'h', targets: [5], controls: [], params: [], step: 0 }]
    };
    const result = validateCircuit(circuit);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some(e => e.includes('target 5 out of range'))).toBe(true);
    }
  });

  it('rejects control index out of range', () => {
    const circuit: CircuitModel = {
      schemaVersion: 1,
      numQubits: 2,
      algorithmId: 'test',
      algorithmLabel: 'Test',
      params: {},
      gates: [{ name: 'cx', targets: [1], controls: [10], params: [], step: 0 }]
    };
    const result = validateCircuit(circuit);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some(e => e.includes('control 10 out of range'))).toBe(true);
    }
  });

  it('rejects unknown gate name', () => {
    const circuit = {
      schemaVersion: 1,
      numQubits: 1,
      algorithmId: 'test',
      algorithmLabel: 'Test',
      params: {},
      gates: [{ name: 'bogus', targets: [0], controls: [], params: [], step: 0 }]
    } as unknown as CircuitModel;
    const result = validateCircuit(circuit);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some(e => e.includes('unknown gate name "bogus"'))).toBe(true);
    }
  });

  it('rejects self-controlling gate', () => {
    const circuit: CircuitModel = {
      schemaVersion: 1,
      numQubits: 2,
      algorithmId: 'test',
      algorithmLabel: 'Test',
      params: {},
      gates: [{ name: 'cx', targets: [1], controls: [1], params: [], step: 0 }]
    };
    const result = validateCircuit(circuit);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some(e => e.includes('controls and targets overlap'))).toBe(true);
    }
  });

  it('rejects non-contiguous steps', () => {
    const circuit: CircuitModel = {
      schemaVersion: 1,
      numQubits: 2,
      algorithmId: 'test',
      algorithmLabel: 'Test',
      params: {},
      gates: [
        { name: 'h', targets: [0], controls: [], params: [], step: 0 },
        { name: 'h', targets: [1], controls: [], params: [], step: 2 } // gap at step 1
      ]
    };
    const result = validateCircuit(circuit);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some(e => e.includes('Steps are not contiguous'))).toBe(true);
    }
  });

  it('rejects decreasing steps', () => {
    const circuit: CircuitModel = {
      schemaVersion: 1,
      numQubits: 2,
      algorithmId: 'test',
      algorithmLabel: 'Test',
      params: {},
      gates: [
        { name: 'h', targets: [0], controls: [], params: [], step: 1 },
        { name: 'h', targets: [1], controls: [], params: [], step: 0 }
      ]
    };
    const result = validateCircuit(circuit);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some(e => e.includes('must be non-decreasing'))).toBe(true);
    }
  });
});

describe('buildBell', () => {
  it('produces a valid 2-qubit circuit', () => {
    const circuit = buildBell();
    const result = validateCircuit(circuit);
    expect(result.valid).toBe(true);
    expect(circuit.numQubits).toBe(2);
    expect(circuit.algorithmId).toBe('bell');
  });

  it('has correct gate sequence: H on q0, then CNOT 0→1', () => {
    const circuit = buildBell();
    expect(circuit.gates.length).toBe(2);
    expect(circuit.gates[0]).toEqual({
      name: 'h',
      targets: [0],
      controls: [],
      params: [],
      step: 0
    });
    expect(circuit.gates[1]).toEqual({
      name: 'cx',
      targets: [1],
      controls: [0],
      params: [],
      step: 1
    });
  });
});

describe('buildGrover', () => {
  it('produces a valid 3-qubit circuit by default', () => {
    const circuit = buildGrover();
    const result = validateCircuit(circuit);
    expect(result.valid).toBe(true);
    expect(circuit.numQubits).toBe(3);
    expect(circuit.algorithmId).toBe('grover');
    expect(circuit.params.target).toBe('111');
  });

  it('matches LLD §1.3 canonical Grover-3 fixture exactly (21 gates)', () => {
    const circuit = buildGrover(3, '111');
    
    // Must be exactly 21 gates per LLD §1.3
    expect(circuit.gates.length).toBe(21);
    
    // Verify the exact sequence from LLD §1.3
    const expectedGates = [
      // Step 0: Hadamard layer
      { name: 'h', targets: [0], controls: [], params: [], step: 0 },
      { name: 'h', targets: [1], controls: [], params: [], step: 0 },
      { name: 'h', targets: [2], controls: [], params: [], step: 0 },
      
      // Steps 1-3: Oracle (CCZ via H·q2, CCX, H·q2)
      { name: 'h', targets: [2], controls: [], params: [], step: 1 },
      { name: 'ccx', targets: [2], controls: [0, 1], params: [], step: 2 },
      { name: 'h', targets: [2], controls: [], params: [], step: 3 },
      
      // Step 4: Hadamard layer (diffusion start)
      { name: 'h', targets: [0], controls: [], params: [], step: 4 },
      { name: 'h', targets: [1], controls: [], params: [], step: 4 },
      { name: 'h', targets: [2], controls: [], params: [], step: 4 },
      
      // Step 5: X layer
      { name: 'x', targets: [0], controls: [], params: [], step: 5 },
      { name: 'x', targets: [1], controls: [], params: [], step: 5 },
      { name: 'x', targets: [2], controls: [], params: [], step: 5 },
      
      // Steps 6-8: Multi-controlled-Z (CCZ via H·q2, CCX, H·q2)
      { name: 'h', targets: [2], controls: [], params: [], step: 6 },
      { name: 'ccx', targets: [2], controls: [0, 1], params: [], step: 7 },
      { name: 'h', targets: [2], controls: [], params: [], step: 8 },
      
      // Step 9: X layer (undo)
      { name: 'x', targets: [0], controls: [], params: [], step: 9 },
      { name: 'x', targets: [1], controls: [], params: [], step: 9 },
      { name: 'x', targets: [2], controls: [], params: [], step: 9 },
      
      // Step 10: Hadamard layer (diffusion end)
      { name: 'h', targets: [0], controls: [], params: [], step: 10 },
      { name: 'h', targets: [1], controls: [], params: [], step: 10 },
      { name: 'h', targets: [2], controls: [], params: [], step: 10 }
    ];

    // Compare each gate exactly
    for (let i = 0; i < expectedGates.length; i++) {
      expect(circuit.gates[i]).toEqual(expectedGates[i]);
    }
  });
});
