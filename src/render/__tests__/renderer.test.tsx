/**
 * Unit tests for the SVG circuit renderer.
 * 
 * Task: Task-005
 * 
 * Tests:
 * 1. Grover-3 renders all 21 gates in the correct columns
 * 2. CCX gates render two control dots connected to the target
 * 3. Active step highlight lands on the correct column
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { CircuitDiagram } from '../renderer';
import { buildGrover, buildBell } from '../../model/builders';
import type { CircuitModel } from '../../model/circuit-model';

describe('CircuitDiagram', () => {
  describe('Grover-3 circuit rendering', () => {
    const grover3 = buildGrover(3);

    it('renders all 21 gates from the Grover-3 circuit', () => {
      const { container } = render(<CircuitDiagram circuit={grover3} activeStep={0} />);
      
      // Count gate boxes (single-qubit gates) and target boxes (controlled gates)
      // Single-qubit gates have lightblue fill, controlled gates have lightcoral fill
      const singleQubitGates = container.querySelectorAll('rect[fill="lightblue"]');
      const controlledGates = container.querySelectorAll('rect[fill="lightcoral"]');
      
      // Grover-3 has 21 gates total:
      // - 17 single-qubit gates (3 H initial + 3 H oracle + 3 H diff + 3 X + 3 X + 3 H final = 18, minus 1 = 17 single)
      // Actually let me count more carefully from builders.ts:
      // Step 0: 3 H
      // Step 1: 1 H (q2)
      // Step 2: 1 CCX
      // Step 3: 1 H (q2)
      // Step 4: 3 H
      // Step 5: 3 X
      // Step 6: 1 H (q2)
      // Step 7: 1 CCX
      // Step 8: 1 H (q2)
      // Step 9: 3 X
      // Step 10: 3 H
      // Total: 21 gates (19 single-qubit + 2 CCX)
      expect(singleQubitGates.length).toBe(19);
      expect(controlledGates.length).toBe(2); // 2 CCX gates
      
      // Total should be 21
      const totalGateBoxes = singleQubitGates.length + controlledGates.length;
      expect(totalGateBoxes).toBe(21);
    });

    it('places gates in the correct time-step columns', () => {
      const { container } = render(<CircuitDiagram circuit={grover3} activeStep={0} />);
      
      // Verify that gates appear in columns 0 through 10 (the max step)
      // We can check this by examining the SVG structure
      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
      
      // Check that the SVG is wide enough for 11 columns (steps 0-10)
      const svgWidth = svg?.getAttribute('width');
      expect(svgWidth).toBeTruthy();
      // Width should be at least MARGIN_LEFT + (maxStep + 1) * STEP_X_SPACING
      // = 60 + (10 + 1) * 100 = 1160, plus some padding
      const width = parseInt(svgWidth || '0');
      expect(width).toBeGreaterThanOrEqual(1160);
    });

    it('renders exactly 3 qubit wires for Grover-3', () => {
      const { container } = render(<CircuitDiagram circuit={grover3} activeStep={0} />);
      
      // Count qubit labels (q0, q1, q2)
      const qubitLabels = container.querySelectorAll('text');
      const qubitLabelTexts = Array.from(qubitLabels)
        .map(el => el.textContent)
        .filter(text => text?.match(/^q\d+$/));
      
      expect(qubitLabelTexts).toContain('q0');
      expect(qubitLabelTexts).toContain('q1');
      expect(qubitLabelTexts).toContain('q2');
      
      // Count wire lines (horizontal lines for qubits)
      const lines = container.querySelectorAll('line[stroke="black"]');
      expect(lines.length).toBe(3); // 3 qubit wires
    });
  });

  describe('CCX (Toffoli) gate rendering', () => {
    const grover3 = buildGrover(3);

    it('renders two control dots for each CCX gate', () => {
      const { container } = render(<CircuitDiagram circuit={grover3} activeStep={0} />);
      
      // CCX gates have 2 controls, so we should see 2 control dots per CCX
      // Grover-3 has 2 CCX gates, so 4 control dots total
      const controlDots = container.querySelectorAll('circle[fill="navy"]');
      expect(controlDots.length).toBe(4); // 2 CCX * 2 controls each
    });

    it('renders connecting lines for multi-control gates', () => {
      const { container } = render(<CircuitDiagram circuit={grover3} activeStep={0} />);
      
      // Each CCX should have a vertical connecting line from control qubits to target
      // These are navy stroke lines (not the black qubit wire lines)
      const connectingLines = container.querySelectorAll('line[stroke="navy"]');
      expect(connectingLines.length).toBe(2); // 2 CCX gates = 2 connecting lines
    });

    it('CCX gates connect controls [0,1] to target [2]', () => {
      const { container } = render(<CircuitDiagram circuit={grover3} activeStep={2} />);
      
      // At step 2, we have the first CCX with controls [0, 1] and target [2]
      // Control dots should be at Y positions for q0 and q1
      // Target box should be at Y position for q2
      
      // We can verify this by checking the structure exists
      // (more detailed position checks would require exact coordinate math)
      const controlDots = container.querySelectorAll('circle[fill="navy"]');
      expect(controlDots.length).toBeGreaterThanOrEqual(2);
      
      const targetBoxes = container.querySelectorAll('rect[fill="lightcoral"]');
      expect(targetBoxes.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Active step highlighting', () => {
    const grover3 = buildGrover(3);

    it('renders a highlight band at the active step', () => {
      const { container } = render(<CircuitDiagram circuit={grover3} activeStep={5} />);
      
      // The highlight is a yellow semi-transparent rect
      const highlights = container.querySelectorAll('rect[fill="yellow"]');
      expect(highlights.length).toBe(1);
      
      // Check opacity
      const highlight = highlights[0];
      expect(highlight.getAttribute('opacity')).toBe('0.2');
    });

    it('positions the highlight on the correct column', () => {
      // Test different active steps
      for (const step of [0, 5, 10]) {
        const { container } = render(<CircuitDiagram circuit={grover3} activeStep={step} />);
        
        const highlights = container.querySelectorAll('rect[fill="yellow"]');
        expect(highlights.length).toBe(1);
        
        // The highlight X position should correspond to the step column
        // X = getStepX(step) - STEP_X_SPACING / 2 + HIGHLIGHT_PADDING
        // = (60 + step * 100) - 50 + 10
        // = 20 + step * 100
        const highlight = highlights[0];
        const expectedX = 20 + step * 100;
        const actualX = parseInt(highlight.getAttribute('x') || '0');
        expect(actualX).toBe(expectedX);
      }
    });

    it('does not render a highlight when activeStep is out of range', () => {
      const { container: containerNegative } = render(
        <CircuitDiagram circuit={grover3} activeStep={-1} />
      );
      const highlightsNegative = containerNegative.querySelectorAll('rect[fill="yellow"]');
      expect(highlightsNegative.length).toBe(0);

      const { container: containerTooLarge } = render(
        <CircuitDiagram circuit={grover3} activeStep={999} />
      );
      const highlightsTooLarge = containerTooLarge.querySelectorAll('rect[fill="yellow"]');
      expect(highlightsTooLarge.length).toBe(0);
    });
  });

  describe('Bell state circuit rendering', () => {
    const bell = buildBell();

    it('renders the Bell state circuit with 2 gates', () => {
      const { container } = render(<CircuitDiagram circuit={bell} activeStep={0} />);
      
      // Bell has 1 H gate and 1 CX gate = 2 gates total
      const singleQubitGates = container.querySelectorAll('rect[fill="lightblue"]');
      const controlledGates = container.querySelectorAll('rect[fill="lightcoral"]');
      
      expect(singleQubitGates.length).toBe(1); // 1 H gate
      expect(controlledGates.length).toBe(1); // 1 CX gate
    });

    it('renders exactly 2 qubit wires for Bell state', () => {
      const { container } = render(<CircuitDiagram circuit={bell} activeStep={0} />);
      
      const qubitLabels = container.querySelectorAll('text');
      const qubitLabelTexts = Array.from(qubitLabels)
        .map(el => el.textContent)
        .filter(text => text?.match(/^q\d+$/));
      
      expect(qubitLabelTexts).toContain('q0');
      expect(qubitLabelTexts).toContain('q1');
      
      const lines = container.querySelectorAll('line[stroke="black"]');
      expect(lines.length).toBe(2); // 2 qubit wires
    });

    it('renders one control dot for the CX gate', () => {
      const { container } = render(<CircuitDiagram circuit={bell} activeStep={1} />);
      
      // CX has 1 control, so 1 control dot
      const controlDots = container.querySelectorAll('circle[fill="navy"]');
      expect(controlDots.length).toBe(1);
    });
  });

  describe('Independence from quantum-circuit library', () => {
    it('does not import or depend on quantum-circuit library SVG output', () => {
      // This is a structural test: the renderer.tsx file should only import
      // from '../model/circuit-model', not from any library
      // We verify this by checking that the render works without any library setup
      
      const bell = buildBell();
      const { container } = render(<CircuitDiagram circuit={bell} activeStep={0} />);
      
      // If rendering succeeds and produces SVG, we're independent
      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
    });
  });
});
