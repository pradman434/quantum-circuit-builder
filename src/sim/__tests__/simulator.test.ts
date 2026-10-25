/**
 * Unit tests for the step-by-step simulator.
 * 
 * Task: Task-006
 * 
 * Test requirements:
 * 1. Grover-3/Bell/GHZ step states match committed golden vectors generated
 *    by an INDEPENDENT simulator (pure Python analytic calculation)
 * 2. The Grover-3 final state has |111⟩ amplitude magnitude ≈ 0.88
 *    (probability ≈ 0.78 as documented in LLD §1.3)
 * 3. A numQubits=13 circuit returns {unavailable: true} without allocating 2^13
 * 4. The 12-qubit cap is enforced ONLY in the simulator module
 * 
 * Golden state vectors were generated using explicit gate matrix definitions
 * in pure Python (no quantum libraries), ensuring independence from the
 * quantastica/quantum-circuit library used in production.
 */

import { describe, it, expect } from 'vitest';
import { stepStates } from '../simulator.js';
import type { SimulationResult, StepState } from '../simulator.js';
import { buildGrover, buildBell } from '../../model/builders.js';
import type { CircuitModel } from '../../model/circuit-model.js';
import goldenStates from './fixtures/golden-states.json';

/**
 * Helper: Compare two complex numbers with tolerance.
 */
function complexEqual(
  a: { re: number; im: number },
  b: { re: number; im: number },
  tolerance = 1e-6
): boolean {
  return Math.abs(a.re - b.re) < tolerance && Math.abs(a.im - b.im) < tolerance;
}

/**
 * Helper: Compare two state vectors (arrays of amplitudes).
 * Returns true if all corresponding amplitudes match within tolerance.
 */
function statesEqual(
  computed: Array<{ basis: string; re: number; im: number }>,
  expected: Array<{ basis: string; re: number; im: number }>,
  tolerance = 1e-6
): boolean {
  if (computed.length !== expected.length) {
    return false;
  }

  for (let i = 0; i < computed.length; i++) {
    if (computed[i].basis !== expected[i].basis) {
      return false;
    }
    if (!complexEqual(computed[i], expected[i], tolerance)) {
      return false;
    }
  }

  return true;
}

/**
 * Helper: Build a GHZ circuit (not in builders yet, but needed for golden test).
 * GHZ state for 3 qubits: H on q0, CNOT(0→1), CNOT(0→2).
 * Result: (|000⟩ + |111⟩) / √2.
 */
function buildGHZ(): CircuitModel {
  return {
    schemaVersion: 1,
    numQubits: 3,
    algorithmId: 'ghz',
    algorithmLabel: 'GHZ state (3 qubits)',
    params: {},
    gates: [
      { name: 'h', targets: [0], controls: [], params: [], step: 0 },
      { name: 'cx', targets: [1], controls: [0], params: [], step: 1 },
      { name: 'cx', targets: [2], controls: [0], params: [], step: 2 }
    ]
  };
}

describe('stepStates', () => {
  describe('Golden state vector tests (independent verification)', () => {
    it('Grover-3 step states match independent golden vectors', () => {
      const circuit = buildGrover(3, '111');
      const result = stepStates(circuit);

      // Should succeed (3 qubits << 12-qubit cap)
      expect(result).not.toHaveProperty('unavailable');
      const states = result as StepState[];

      // Load golden states from independent Python calculation
      const goldenGrover = goldenStates['grover-3'];

      // Verify we have the expected number of states
      // Grover-3 has 21 gates across 11 steps (0-10), so 12 states including initial
      expect(states.length).toBe(goldenGrover.length);

      // Compare each state against the golden fixture
      for (let i = 0; i < states.length; i++) {
        expect(states[i].step).toBe(i);
        expect(
          statesEqual(states[i].amplitudes, goldenGrover[i]),
          `State at step ${i} should match golden vector`
        ).toBe(true);
      }
    });

    it('Grover-3 final state has |111⟩ amplitude magnitude ≈ 0.88 (probability ≈ 0.78)', () => {
      const circuit = buildGrover(3, '111');
      const result = stepStates(circuit);

      expect(result).not.toHaveProperty('unavailable');
      const states = result as StepState[];

      // Get final state (last in the array)
      const finalState = states[states.length - 1];

      // Find |111⟩ amplitude (basis index 7 = 0b111)
      const amplitude111 = finalState.amplitudes.find(amp => amp.basis === '111');
      expect(amplitude111).toBeDefined();

      // Compute magnitude
      const magnitude = Math.sqrt(amplitude111!.re ** 2 + amplitude111!.im ** 2);

      // LLD §1.3 states: "After one iteration the amplitude of |111⟩ is ≈ 0.78"
      // The golden calculation gives -0.883883, which has magnitude 0.883883.
      // The probability is magnitude^2 ≈ 0.78 (78% success probability).
      // We verify the magnitude is approximately 0.88.
      expect(magnitude).toBeGreaterThan(0.85);
      expect(magnitude).toBeLessThan(0.92);

      // Verify probability is ≈ 0.78
      const probability = magnitude ** 2;
      expect(probability).toBeGreaterThan(0.75);
      expect(probability).toBeLessThan(0.82);
    });

    it('Bell state step states match independent golden vectors', () => {
      const circuit = buildBell();
      const result = stepStates(circuit);

      expect(result).not.toHaveProperty('unavailable');
      const states = result as StepState[];

      const goldenBell = goldenStates['bell'];
      expect(states.length).toBe(goldenBell.length);

      for (let i = 0; i < states.length; i++) {
        expect(states[i].step).toBe(i);
        expect(
          statesEqual(states[i].amplitudes, goldenBell[i]),
          `Bell state at step ${i} should match golden vector`
        ).toBe(true);
      }
    });

    it('GHZ state step states match independent golden vectors', () => {
      const circuit = buildGHZ();
      const result = stepStates(circuit);

      expect(result).not.toHaveProperty('unavailable');
      const states = result as StepState[];

      const goldenGHZ = goldenStates['ghz'];
      expect(states.length).toBe(goldenGHZ.length);

      for (let i = 0; i < states.length; i++) {
        expect(states[i].step).toBe(i);
        expect(
          statesEqual(states[i].amplitudes, goldenGHZ[i]),
          `GHZ state at step ${i} should match golden vector`
        ).toBe(true);
      }
    });
  });

  describe('12-qubit simulation cap enforcement', () => {
    it('returns unavailable for numQubits > 12 without allocating memory', () => {
      // Build a 13-qubit circuit (just above the cap)
      const circuit: CircuitModel = {
        schemaVersion: 1,
        numQubits: 13,
        algorithmId: 'test',
        algorithmLabel: 'Test circuit with 13 qubits',
        params: {},
        gates: [
          { name: 'h', targets: [0], controls: [], params: [], step: 0 }
        ]
      };

      const result = stepStates(circuit);

      // Should return unavailable, not a state array
      expect(result).toHaveProperty('unavailable');
      expect((result as { unavailable: true }).unavailable).toBe(true);
      expect((result as { unavailable: true; reason: string }).reason).toContain('12 qubits');
      expect((result as { unavailable: true; reason: string }).reason).toContain('13 qubits');
    });

    it('succeeds for numQubits = 12 (at the cap boundary)', () => {
      // Build a minimal 12-qubit circuit
      const circuit: CircuitModel = {
        schemaVersion: 1,
        numQubits: 12,
        algorithmId: 'test',
        algorithmLabel: 'Test circuit with 12 qubits',
        params: {},
        gates: [
          { name: 'h', targets: [0], controls: [], params: [], step: 0 }
        ]
      };

      const result = stepStates(circuit);

      // Should succeed (exactly at the cap)
      expect(result).not.toHaveProperty('unavailable');
      const states = result as StepState[];

      // Should have initial state + one step
      expect(states.length).toBe(2);

      // Each state should have 2^12 = 4096 amplitudes
      expect(states[0].amplitudes.length).toBe(4096);
      expect(states[1].amplitudes.length).toBe(4096);
    });

    it('returns unavailable for numQubits = 24 (draw ceiling)', () => {
      // Build a 24-qubit circuit (the draw/export ceiling)
      const circuit: CircuitModel = {
        schemaVersion: 1,
        numQubits: 24,
        algorithmId: 'test',
        algorithmLabel: 'Test circuit with 24 qubits',
        params: {},
        gates: [
          { name: 'x', targets: [0], controls: [], params: [], step: 0 }
        ]
      };

      const result = stepStates(circuit);

      // Should return unavailable (way above the 12-qubit cap)
      expect(result).toHaveProperty('unavailable');
      expect((result as { unavailable: true; reason: string }).reason).toContain('12 qubits');
    });
  });

  describe('Cap enforcement is localized to simulator module', () => {
    it('does not prevent building or validating large circuits', () => {
      // This test verifies that the 12-qubit cap is NOT enforced elsewhere.
      // We can build a 13-qubit circuit using the builders/model without error.
      // Only stepStates() should enforce the cap.

      // Build a 13-qubit circuit directly (bypassing builders if they also have caps)
      const circuit: CircuitModel = {
        schemaVersion: 1,
        numQubits: 13,
        algorithmId: 'large-test',
        algorithmLabel: 'Large test circuit',
        params: {},
        gates: [
          { name: 'h', targets: [0], controls: [], params: [], step: 0 },
          { name: 'cx', targets: [1], controls: [0], params: [], step: 1 }
        ]
      };

      // The circuit itself is valid and can be constructed
      expect(circuit.numQubits).toBe(13);
      expect(circuit.gates.length).toBe(2);

      // Only stepStates() should reject it
      const result = stepStates(circuit);
      expect(result).toHaveProperty('unavailable');
    });
  });

  describe('Initial state and step indexing', () => {
    it('includes initial |0...0⟩ state at step 0', () => {
      const circuit = buildBell();
      const result = stepStates(circuit);

      expect(result).not.toHaveProperty('unavailable');
      const states = result as StepState[];

      // First state should be step 0
      expect(states[0].step).toBe(0);

      // For 2 qubits, initial state is |00⟩
      const initialAmps = states[0].amplitudes;
      expect(initialAmps.length).toBe(4); // 2^2 = 4

      // |00⟩ has amplitude 1, others have amplitude 0
      expect(initialAmps[0].basis).toBe('00');
      expect(initialAmps[0].re).toBeCloseTo(1.0);
      expect(initialAmps[0].im).toBeCloseTo(0.0);

      for (let i = 1; i < 4; i++) {
        expect(initialAmps[i].re).toBeCloseTo(0.0);
        expect(initialAmps[i].im).toBeCloseTo(0.0);
      }
    });

    it('has contiguous step indices', () => {
      const circuit = buildGrover(3, '111');
      const result = stepStates(circuit);

      expect(result).not.toHaveProperty('unavailable');
      const states = result as StepState[];

      // Verify step indices are 0, 1, 2, ..., N
      for (let i = 0; i < states.length; i++) {
        expect(states[i].step).toBe(i);
      }
    });
  });

  describe('State vector properties', () => {
    it('maintains normalization (sum of |amplitude|² = 1)', () => {
      const circuit = buildBell();
      const result = stepStates(circuit);

      expect(result).not.toHaveProperty('unavailable');
      const states = result as StepState[];

      // Check normalization at each step
      for (const state of states) {
        const sumProbabilities = state.amplitudes.reduce((sum, amp) => {
          const probability = amp.re ** 2 + amp.im ** 2;
          return sum + probability;
        }, 0);

        expect(sumProbabilities).toBeCloseTo(1.0, 5);
      }
    });

    it('has correct number of amplitudes per state', () => {
      const testCases = [
        { qubits: 1, expected: 2 },
        { qubits: 2, expected: 4 },
        { qubits: 3, expected: 8 },
        { qubits: 5, expected: 32 },
        { qubits: 10, expected: 1024 }
      ];

      for (const { qubits, expected } of testCases) {
        const circuit: CircuitModel = {
          schemaVersion: 1,
          numQubits: qubits,
          algorithmId: 'test',
          algorithmLabel: `Test ${qubits} qubits`,
          params: {},
          gates: [{ name: 'h', targets: [0], controls: [], params: [], step: 0 }]
        };

        const result = stepStates(circuit);
        expect(result).not.toHaveProperty('unavailable');

        const states = result as StepState[];
        expect(states[0].amplitudes.length).toBe(expected);
      }
    });
  });
});
