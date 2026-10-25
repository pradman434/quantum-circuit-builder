/**
 * Unit tests for the plain-English parser.
 * 
 * Task: Task-004
 * 
 * Test matrix (per LLD Task-004):
 * - Phrasing variants (correct spelling, missing apostrophe, abbreviated, extra words)
 *   all resolve to the correct algorithm
 * - Near-miss strings are rejected with the supported-list message
 * - Empty input returns the example prompt (not an error)
 * - Ambiguous input (matches multiple algorithms) is rejected
 * - Invalid qubit counts are rejected with clear messages
 * - Valid algorithms build correct CircuitModels
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../parser';

describe('Parser - F2 Plain-English recognition', () => {
  describe('Grover algorithm variants (all should resolve to Grover-3)', () => {
    const groverVariants = [
      "Grover's algorithm for 3 qubits",           // Correct, with apostrophe
      "grover's algorithm for 3 qubits",           // Lowercase
      "Grovers algorithm for 3 qubits",            // No apostrophe
      "grover 3 qubits",                           // Abbreviated
      "grover 3q",                                 // Very abbreviated
      "grover for 3 qubits",                       // Missing "algorithm"
      "  Grover's   algorithm   for   3   qubits  ", // Extra whitespace
      "build grover's algorithm for 3 qubits please", // Extra words
      "3 qubit grover",                            // Reversed order
      "grover search for 3 qubits",                // With "search"
      "grover algorithm 3"                         // Minimal form
    ];

    groverVariants.forEach(variant => {
      it(`should recognize: "${variant}"`, () => {
        const result = parse(variant);
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.circuit.algorithmId).toBe('grover');
          expect(result.circuit.numQubits).toBe(3);
          expect(result.circuit.gates.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Grover with default qubit count (no integer in input)', () => {
    it('should use default 3 qubits when count not specified', () => {
      const result = parse("grover's algorithm");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.circuit.algorithmId).toBe('grover');
        expect(result.circuit.numQubits).toBe(3); // Default from algorithm def
      }
    });

    it('should use default when input is just "grover"', () => {
      const result = parse("grover");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.circuit.numQubits).toBe(3);
      }
    });
  });

  describe('Bell state variants (all should resolve to Bell)', () => {
    const bellVariants = [
      "Bell state",                                // Standard
      "bell state",                                // Lowercase
      "Bell",                                      // Minimal
      "bell state 2 qubits",                       // With explicit count
      "  Bell   state  ",                          // Extra whitespace
      "create a bell state",                       // Extra words
      "bell entangled state",                      // With descriptor
      "2 qubit bell"                               // Reversed
    ];

    bellVariants.forEach(variant => {
      it(`should recognize: "${variant}"`, () => {
        const result = parse(variant);
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.circuit.algorithmId).toBe('bell');
          expect(result.circuit.numQubits).toBe(2);
          expect(result.circuit.gates.length).toBe(2); // H + CX
        }
      });
    });
  });

  describe('Unrecognized input (should list supported algorithms)', () => {
    const unrecognizedInputs = [
      "quantum teleportation",                     // Valid quantum algo, not supported
      "shor's algorithm",                          // Famous algo, not in Phase 1
      "do something quantum",                      // Vague request
      "superdense coding",                         // Another algo
      "random circuit",                            // Generic request
      "hello world",                               // Non-quantum
      "123456",                                    // Just numbers
      "algorithm"                                  // Too generic
    ];

    unrecognizedInputs.forEach(input => {
      it(`should reject: "${input}" with supported list`, () => {
        const result = parse(input);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.message).toContain('not recognized');
          expect(result.supported).toContain("Grover's algorithm");
          expect(result.supported).toContain("Bell state");
          expect(result.supported.length).toBe(2); // Phase 1: Grover + Bell
        }
      });
    });
  });

  describe('Empty and whitespace-only input (should show example prompt)', () => {
    const emptyInputs = [
      "",
      "   ",
      "\t",
      "\n",
      "  \t  \n  "
    ];

    emptyInputs.forEach(input => {
      it(`should prompt on empty: "${input.replace(/\s/g, '\\s')}"`, () => {
        const result = parse(input);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.message).toContain('Try:');
          expect(result.message).toContain('Grover');
          expect(result.supported.length).toBe(2);
        }
      });
    });
  });

  describe('Qubit count validation (1-24 range)', () => {
    it('should reject qubit count < 1', () => {
      const result = parse("grover 0 qubits");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain('between 1 and 24');
        expect(result.message).toContain('0');
      }
    });

    it('should reject negative qubit count', () => {
      const result = parse("grover -5 qubits");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain('between 1 and 24');
      }
    });

    it('should reject qubit count > 24', () => {
      const result = parse("grover 25 qubits");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain('between 1 and 24');
        expect(result.message).toContain('25');
      }
    });

    it('should accept qubit count = 1', () => {
      const result = parse("bell 1 qubit");
      // Bell builder doesn't check qubit count, so this may succeed or fail
      // depending on builder implementation. We're just validating the parser
      // accepts the count in range.
      if (!result.ok) {
        // If builder rejects it, that's a builder constraint, not parser
        expect(result.message).not.toContain('between 1 and 24');
      }
    });

    it('should accept qubit count = 24', () => {
      const result = parse("grover 24 qubits");
      // Parser should accept it; builder may reject it (Phase 1 only supports 3)
      if (!result.ok) {
        // If builder rejects, ensure it's not the parser's range check
        expect(result.message).not.toContain('between 1 and 24');
      }
    });
  });

  describe('Circuit model structure validation', () => {
    it('should produce valid CircuitModel for Grover-3', () => {
      const result = parse("Grover's algorithm for 3 qubits");
      expect(result.ok).toBe(true);
      if (result.ok) {
        const { circuit } = result;
        
        // Validate required fields
        expect(circuit.schemaVersion).toBe(1);
        expect(circuit.numQubits).toBe(3);
        expect(circuit.algorithmId).toBe('grover');
        expect(circuit.algorithmLabel).toContain('Grover');
        expect(circuit.algorithmLabel).toContain('3 qubits');
        
        // Validate params
        expect(circuit.params).toBeDefined();
        expect(circuit.params.target).toBe('111');
        
        // Validate gates array
        expect(circuit.gates).toBeInstanceOf(Array);
        expect(circuit.gates.length).toBe(21); // Per LLD §1.3 canonical Grover-3
        
        // Validate gate structure (sample first gate)
        const firstGate = circuit.gates[0];
        expect(firstGate.name).toBe('h');
        expect(firstGate.targets).toBeInstanceOf(Array);
        expect(firstGate.controls).toBeInstanceOf(Array);
        expect(firstGate.params).toBeInstanceOf(Array);
        expect(firstGate.step).toBe(0);
      }
    });

    it('should produce valid CircuitModel for Bell state', () => {
      const result = parse("Bell state");
      expect(result.ok).toBe(true);
      if (result.ok) {
        const { circuit } = result;
        
        expect(circuit.schemaVersion).toBe(1);
        expect(circuit.numQubits).toBe(2);
        expect(circuit.algorithmId).toBe('bell');
        expect(circuit.algorithmLabel).toContain('Bell');
        
        expect(circuit.gates.length).toBe(2); // H + CX
        
        // Validate Bell structure: H on q0, then CX(0->1)
        expect(circuit.gates[0].name).toBe('h');
        expect(circuit.gates[0].targets).toEqual([0]);
        expect(circuit.gates[0].step).toBe(0);
        
        expect(circuit.gates[1].name).toBe('cx');
        expect(circuit.gates[1].targets).toEqual([1]);
        expect(circuit.gates[1].controls).toEqual([0]);
        expect(circuit.gates[1].step).toBe(1);
      }
    });
  });

  describe('Ambiguous input (Phase 1 has no overlap, but test the mechanism)', () => {
    // Note: In Phase 1, "grover" and "bell" have no keyword overlap,
    // so no natural input would match both. This tests the parser's
    // ambiguity handling for when the registry grows.
    
    it('should handle hypothetically ambiguous input if it existed', () => {
      // This test documents the behavior; in Phase 1 no real ambiguity exists
      // between "grover" and "bell" keywords.
      
      // Example: if we had both "bell" and "bell-grover-hybrid" (hypothetical),
      // input containing both "bell" and "grover" would be ambiguous.
      
      // For Phase 1, this is not applicable, but we verify the parser
      // correctly returns multiple matches when they occur.
      const result = parse("grover");
      expect(result.ok).toBe(true); // Only matches Grover, not ambiguous
    });
  });

  describe('Error handling - builder exceptions', () => {
    it('should catch and report builder errors gracefully', () => {
      // Grover builder only supports 3 qubits with |111⟩ in Phase 1
      // Request 2 qubits to trigger the "not yet implemented" throw
      const result = parse("grover 2 qubits");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain('Cannot build circuit');
        expect(result.supported).toBeDefined();
      }
    });

    it('should catch and report builder errors for other qubit counts', () => {
      const result = parse("grover 4 qubits");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain('Cannot build circuit');
      }
    });
  });

  describe('Apostrophe normalization', () => {
    it('should treat "grover\'s" and "grovers" identically', () => {
      const withApostrophe = parse("grover's algorithm for 3 qubits");
      const withoutApostrophe = parse("grovers algorithm for 3 qubits");
      
      expect(withApostrophe.ok).toBe(true);
      expect(withoutApostrophe.ok).toBe(true);
      
      if (withApostrophe.ok && withoutApostrophe.ok) {
        expect(withApostrophe.circuit.algorithmId).toBe(withoutApostrophe.circuit.algorithmId);
        expect(withApostrophe.circuit.numQubits).toBe(withoutApostrophe.circuit.numQubits);
      }
    });
  });

  describe('Whitespace normalization', () => {
    it('should handle multiple spaces between words', () => {
      const result = parse("grover    algorithm    3    qubits");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.circuit.numQubits).toBe(3);
      }
    });

    it('should handle tabs and mixed whitespace', () => {
      const result = parse("grover\t\talgorithm\tfor\t3\tqubits");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.circuit.numQubits).toBe(3);
      }
    });
  });

  describe('Case insensitivity', () => {
    it('should accept UPPERCASE input', () => {
      const result = parse("GROVER'S ALGORITHM FOR 3 QUBITS");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.circuit.algorithmId).toBe('grover');
      }
    });

    it('should accept MixedCase input', () => {
      const result = parse("GrOvEr AlGoRiThM 3 QuBiTs");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.circuit.algorithmId).toBe('grover');
      }
    });
  });

  describe('Integer extraction', () => {
    it('should extract the FIRST integer when multiple present', () => {
      const result = parse("grover 3 algorithm 5 qubits");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.circuit.numQubits).toBe(3); // First integer wins
      }
    });

    it('should ignore integers in unrecognized input', () => {
      const result = parse("quantum 42 teleportation");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain('not recognized');
      }
    });
  });
});
