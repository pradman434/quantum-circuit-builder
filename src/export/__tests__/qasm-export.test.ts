/**
 * Unit tests for OpenQASM 2.0 exporter.
 * 
 * Task: Task-003
 * 
 * Test requirements per LLD:
 * 1. Output matches golden fixtures byte-for-byte
 * 2. Output starts with required header lines
 * 3. Same model always produces identical text (determinism)
 */

import { describe, it, expect } from 'vitest';
import { toQasm2 } from '../qasm-export';
import { buildGrover, buildBell } from '../../model/builders';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('toQasm2', () => {
  describe('Required headers', () => {
    it('starts with OPENQASM 2.0 header', () => {
      const circuit = buildBell();
      const qasm = toQasm2(circuit);
      
      expect(qasm.startsWith('OPENQASM 2.0;\n')).toBe(true);
    });

    it('includes qelib1.inc', () => {
      const circuit = buildBell();
      const qasm = toQasm2(circuit);
      const lines = qasm.split('\n');
      
      expect(lines[1]).toBe('include "qelib1.inc";');
    });

    it('declares quantum register with correct size', () => {
      const bell = buildBell();
      const bellQasm = toQasm2(bell);
      expect(bellQasm).toContain('qreg q[2];');

      const grover = buildGrover(3);
      const groverQasm = toQasm2(grover);
      expect(groverQasm).toContain('qreg q[3];');
    });
  });

  describe('Golden fixture byte-for-byte match', () => {
    it('matches golden Grover-3 QASM exactly', () => {
      const circuit = buildGrover(3, '111');
      const qasm = toQasm2(circuit);
      
      // Read golden fixture
      const goldenPath = join(__dirname, 'fixtures', 'grover-3.qasm');
      const golden = readFileSync(goldenPath, 'utf-8');
      
      expect(qasm).toBe(golden);
    });

    it('matches golden Bell state QASM exactly', () => {
      const circuit = buildBell();
      const qasm = toQasm2(circuit);
      
      // Read golden fixture
      const goldenPath = join(__dirname, 'fixtures', 'bell.qasm');
      const golden = readFileSync(goldenPath, 'utf-8');
      
      expect(qasm).toBe(golden);
    });
  });

  describe('Determinism', () => {
    it('produces identical output for same Grover circuit', () => {
      const circuit1 = buildGrover(3, '111');
      const circuit2 = buildGrover(3, '111');
      
      const qasm1 = toQasm2(circuit1);
      const qasm2 = toQasm2(circuit2);
      
      expect(qasm1).toBe(qasm2);
    });

    it('produces identical output for same Bell circuit', () => {
      const circuit1 = buildBell();
      const circuit2 = buildBell();
      
      const qasm1 = toQasm2(circuit1);
      const qasm2 = toQasm2(circuit2);
      
      expect(qasm1).toBe(qasm2);
    });

    it('produces identical output across multiple calls', () => {
      const circuit = buildGrover(3);
      const outputs = Array.from({ length: 5 }, () => toQasm2(circuit));
      
      // All outputs should be identical
      const first = outputs[0];
      outputs.forEach(output => {
        expect(output).toBe(first);
      });
    });
  });

  describe('Gate vocabulary (qelib1.inc only)', () => {
    it('contains only qelib1.inc gate names in Grover-3', () => {
      const circuit = buildGrover(3);
      const qasm = toQasm2(circuit);
      
      // Parse gate lines (skip header)
      const lines = qasm.split('\n').slice(3); // Skip OPENQASM, include, qreg
      const gateLines = lines.filter(line => line.trim() && !line.startsWith('//'));
      
      // Each gate line should be one of: h, x, y, z, cx, ccx, cz
      const qasmGateRegex = /^(h|x|y|z|cx|ccx|cz|measure)\s+/;
      gateLines.forEach(line => {
        expect(line).toMatch(qasmGateRegex);
      });
    });

    it('contains only qelib1.inc gate names in Bell', () => {
      const circuit = buildBell();
      const qasm = toQasm2(circuit);
      
      const lines = qasm.split('\n').slice(3);
      const gateLines = lines.filter(line => line.trim() && !line.startsWith('//'));
      
      const qasmGateRegex = /^(h|x|y|z|cx|ccx|cz|measure)\s+/;
      gateLines.forEach(line => {
        expect(line).toMatch(qasmGateRegex);
      });
    });
  });

  describe('Format validation', () => {
    it('ends with a newline', () => {
      const circuit = buildBell();
      const qasm = toQasm2(circuit);
      
      expect(qasm.endsWith('\n')).toBe(true);
    });

    it('has properly formatted gate calls with semicolons', () => {
      const circuit = buildBell();
      const qasm = toQasm2(circuit);
      
      const lines = qasm.split('\n');
      const gateLines = lines.filter(line => 
        line.includes('q[') && !line.includes('qreg')
      );
      
      // Every gate line should end with semicolon
      gateLines.forEach(line => {
        expect(line.trim().endsWith(';')).toBe(true);
      });
    });

    it('uses correct qubit indexing syntax q[n]', () => {
      const circuit = buildGrover(3);
      const qasm = toQasm2(circuit);
      
      // Should contain q[0], q[1], q[2] in gate calls
      expect(qasm).toMatch(/q\[0\]/);
      expect(qasm).toMatch(/q\[1\]/);
      expect(qasm).toMatch(/q\[2\]/);
      
      // Gate calls (excluding qreg declaration) should not reference out-of-bounds qubits
      const gateLines = qasm.split('\n').filter(line => 
        line.includes('q[') && !line.includes('qreg')
      );
      const outOfBoundsPattern = /q\[[3-9]\d*\]/;
      gateLines.forEach(line => {
        expect(line).not.toMatch(outOfBoundsPattern);
      });
    });
  });

  describe('Edge cases', () => {
    it('handles single-qubit circuit', () => {
      // Create a minimal single-qubit circuit manually
      const circuit = {
        schemaVersion: 1 as const,
        numQubits: 1,
        algorithmId: 'test',
        algorithmLabel: 'Single qubit test',
        params: {},
        gates: [
          { name: 'h' as const, targets: [0], controls: [], params: [], step: 0 }
        ]
      };
      
      const qasm = toQasm2(circuit);
      
      expect(qasm).toContain('qreg q[1];');
      expect(qasm).toContain('h q[0];');
    });

    it('handles gates in correct time order', () => {
      // Bell state has H then CX
      const circuit = buildBell();
      const qasm = toQasm2(circuit);
      
      const lines = qasm.split('\n');
      const hIndex = lines.findIndex(line => line.includes('h q[0]'));
      const cxIndex = lines.findIndex(line => line.includes('cx q[0],q[1]'));
      
      // H should come before CX
      expect(hIndex).toBeLessThan(cxIndex);
    });
  });
});
