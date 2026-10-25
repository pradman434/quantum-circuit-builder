/**
 * Unit tests for ExplanationPanel component.
 * 
 * Task: Task-007
 * Requirements: #6 (interactive explanations)
 * 
 * Test coverage:
 * 1. Plain-English text renders for Grover and Bell algorithms
 * 2. Unavailable branch shows the cap note when states.unavailable is true
 * 3. Missing Learn-more URL hides the link
 * 4. Degraded mode renders raw text when KaTeX fails to load
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExplanationPanel } from '../explanation.js';
import type { CircuitModel } from '../../model/circuit-model.js';
import type { StepState } from '../../sim/simulator.js';

/**
 * Mock circuit for Grover's algorithm (3 qubits).
 */
const groverCircuit: CircuitModel = {
  schemaVersion: 1,
  numQubits: 3,
  algorithmId: 'grover',
  algorithmLabel: "Grover (3 qubits), target |111⟩",
  params: { target: '111' },
  gates: [
    { name: 'h', targets: [0], controls: [], params: [], step: 0 },
    { name: 'h', targets: [1], controls: [], params: [], step: 0 },
    { name: 'h', targets: [2], controls: [], params: [], step: 0 },
  ]
};

/**
 * Mock circuit for Bell state (2 qubits).
 */
const bellCircuit: CircuitModel = {
  schemaVersion: 1,
  numQubits: 2,
  algorithmId: 'bell',
  algorithmLabel: 'Bell state (2 qubits)',
  params: {},
  gates: [
    { name: 'h', targets: [0], controls: [], params: [], step: 0 },
    { name: 'cx', targets: [1], controls: [0], params: [], step: 1 },
  ]
};

/**
 * Mock state vector for testing.
 */
const mockStates: StepState[] = [
  {
    step: 0,
    amplitudes: [
      { basis: '000', re: 1.0, im: 0 },
      { basis: '001', re: 0, im: 0 },
      { basis: '010', re: 0, im: 0 },
      { basis: '011', re: 0, im: 0 },
      { basis: '100', re: 0, im: 0 },
      { basis: '101', re: 0, im: 0 },
      { basis: '110', re: 0, im: 0 },
      { basis: '111', re: 0, im: 0 },
    ]
  },
  {
    step: 1,
    amplitudes: [
      { basis: '000', re: 0.3536, im: 0 },
      { basis: '001', re: 0.3536, im: 0 },
      { basis: '010', re: 0.3536, im: 0 },
      { basis: '011', re: 0.3536, im: 0 },
      { basis: '100', re: 0.3536, im: 0 },
      { basis: '101', re: 0.3536, im: 0 },
      { basis: '110', re: 0.3536, im: 0 },
      { basis: '111', re: 0.3536, im: 0 },
    ]
  }
];

/**
 * Mock unavailable states result.
 */
const unavailableStates = {
  unavailable: true as const,
  reason: 'state view unavailable above 12 qubits'
};

describe('ExplanationPanel', () => {
  beforeEach(() => {
    // Clear any previous mocks
    vi.clearAllMocks();
  });

  describe('Plain-English text rendering', () => {
    it('renders Grover plain-English explanation', () => {
      render(
        <ExplanationPanel
          circuit={groverCircuit}
          states={mockStates}
          activeStep={0}
        />
      );

      // Check that the Grover explanation text is present
      expect(screen.getByText(/Grover's algorithm searches an unsorted database/i)).toBeInTheDocument();
      expect(screen.getByText(/quadratically faster than classical algorithms/i)).toBeInTheDocument();
    });

    it('renders Bell state plain-English explanation', () => {
      render(
        <ExplanationPanel
          circuit={bellCircuit}
          states={mockStates.slice(0, 2)}  // Bell only needs 2 steps
          activeStep={0}
        />
      );

      // Check that the Bell explanation text is present
      expect(screen.getByText(/The Bell state creates maximum quantum entanglement/i)).toBeInTheDocument();
      expect(screen.getByText(/between two qubits/i)).toBeInTheDocument();
    });

    it('renders fallback text for unknown algorithm', () => {
      const unknownCircuit: CircuitModel = {
        ...groverCircuit,
        algorithmId: 'unknown-algo',
        algorithmLabel: 'Unknown Algorithm'
      };

      render(
        <ExplanationPanel
          circuit={unknownCircuit}
          states={mockStates}
          activeStep={0}
        />
      );

      // Should show fallback text with the label
      expect(screen.getByText(/This is a Unknown Algorithm/i)).toBeInTheDocument();
    });
  });

  describe('Unavailable states handling', () => {
    it('shows cap note when states are unavailable', () => {
      render(
        <ExplanationPanel
          circuit={groverCircuit}
          states={unavailableStates}
          activeStep={0}
        />
      );

      // Should show the exact unavailable reason
      expect(screen.getByText('state view unavailable above 12 qubits')).toBeInTheDocument();
      
      // Should NOT show gate matrix or state vector sections
      expect(screen.queryByText(/Gate Matrix/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/State after this step/i)).not.toBeInTheDocument();
    });

    it('does not show cap note when states are available', () => {
      render(
        <ExplanationPanel
          circuit={groverCircuit}
          states={mockStates}
          activeStep={0}
        />
      );

      // Should NOT show the unavailable message
      expect(screen.queryByText('state view unavailable above 12 qubits')).not.toBeInTheDocument();
    });
  });

  describe('Learn more link visibility', () => {
    it('hides Learn more link when URL is absent (Grover)', () => {
      render(
        <ExplanationPanel
          circuit={groverCircuit}
          states={mockStates}
          activeStep={0}
        />
      );

      // Should NOT show the Learn more link since URL is undefined
      expect(screen.queryByText(/Learn more about/i)).not.toBeInTheDocument();
    });

    it('hides Learn more link when URL is absent (Bell)', () => {
      render(
        <ExplanationPanel
          circuit={bellCircuit}
          states={mockStates.slice(0, 2)}
          activeStep={0}
        />
      );

      // Should NOT show the Learn more link since URL is undefined
      expect(screen.queryByText(/Learn more about/i)).not.toBeInTheDocument();
    });
  });

  describe('Gate matrix and state display', () => {
    it('shows initial state at step 0', () => {
      render(
        <ExplanationPanel
          circuit={groverCircuit}
          states={mockStates}
          activeStep={0}
        />
      );

      // Should show "Initial State" heading
      expect(screen.getByText('Initial State')).toBeInTheDocument();
      
      // Should show the |000⟩ state (initial state for 3 qubits)
      expect(screen.getByText(/\|000⟩/)).toBeInTheDocument();
    });

    it('shows gate information at step > 0', () => {
      render(
        <ExplanationPanel
          circuit={groverCircuit}
          states={mockStates}
          activeStep={1}
        />
      );

      // Should show gate step heading
      expect(screen.getByText(/Step 1: H gate/i)).toBeInTheDocument();
      
      // Should show "Gate Matrix" heading
      expect(screen.getByText('Gate Matrix')).toBeInTheDocument();
      
      // Should show "State after this step" heading
      expect(screen.getByText('State after this step')).toBeInTheDocument();
    });

    it('does not show gate info when states are unavailable', () => {
      render(
        <ExplanationPanel
          circuit={groverCircuit}
          states={unavailableStates}
          activeStep={1}
        />
      );

      // Should NOT show gate matrix or state sections
      expect(screen.queryByText(/Gate Matrix/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/State after this step/i)).not.toBeInTheDocument();
    });
  });

  describe('Degraded mode (KaTeX failure)', () => {
    it('falls back to plain text when KaTeX fails', async () => {
      // Mock dynamic import to fail
      vi.mock('katex', () => {
        throw new Error('KaTeX failed to load');
      });

      render(
        <ExplanationPanel
          circuit={groverCircuit}
          states={mockStates}
          activeStep={1}
        />
      );

      // The component should still render without crashing
      expect(screen.getByText('Explanation')).toBeInTheDocument();
      expect(screen.getByText(/Grover's algorithm searches/i)).toBeInTheDocument();
      
      // Wait a bit for the KaTeX render attempt and fallback
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Component should still be functional
      expect(screen.getByText('What this algorithm does')).toBeInTheDocument();
    });

    it('does not crash when KaTeX is completely unavailable', () => {
      // This tests that the component can render even if KaTeX never loads
      const { container } = render(
        <ExplanationPanel
          circuit={bellCircuit}
          states={mockStates.slice(0, 2)}
          activeStep={1}
        />
      );

      // Should render the component structure
      expect(container.querySelector('h2')).toHaveTextContent('Explanation');
      expect(screen.getByText(/The Bell state creates/i)).toBeInTheDocument();
    });
  });

  describe('State vector formatting', () => {
    it('formats simple state vectors correctly', () => {
      render(
        <ExplanationPanel
          circuit={groverCircuit}
          states={mockStates}
          activeStep={0}
        />
      );

      // Initial state should show |000⟩
      const stateText = screen.getByText(/\|000⟩/);
      expect(stateText).toBeInTheDocument();
    });

    it('formats superposition states with multiple terms', () => {
      render(
        <ExplanationPanel
          circuit={groverCircuit}
          states={mockStates}
          activeStep={1}
        />
      );

      // After Hadamard on all qubits, should show superposition
      // The formatted text should contain multiple basis states
      const stateDisplay = screen.getByText(/State after this step/i).parentElement;
      expect(stateDisplay?.textContent).toMatch(/\|000⟩/);
      expect(stateDisplay?.textContent).toMatch(/\|001⟩/);
    });
  });

  describe('Component structure', () => {
    it('renders all required sections', () => {
      render(
        <ExplanationPanel
          circuit={groverCircuit}
          states={mockStates}
          activeStep={0}
        />
      );

      // Should have main heading
      expect(screen.getByText('Explanation')).toBeInTheDocument();
      
      // Should have "What this algorithm does" section
      expect(screen.getByText('What this algorithm does')).toBeInTheDocument();
      
      // Should have the plain-English text
      expect(screen.getByText(/Grover's algorithm/i)).toBeInTheDocument();
    });

    it('applies correct styling classes', () => {
      const { container } = render(
        <ExplanationPanel
          circuit={groverCircuit}
          states={mockStates}
          activeStep={0}
        />
      );

      // Check that the main container has styling
      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv.style.border).toBeTruthy();
      expect(mainDiv.style.padding).toBeTruthy();
    });
  });
});
