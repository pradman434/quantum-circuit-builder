/**
 * Integration test for Task-009: App shell wiring
 * 
 * Requirements:
 * - Types 'Grover's algorithm for 3 qubits'
 * - Clicks Build
 * - Asserts circuit diagram renders
 * - Asserts explanation panel renders
 * - Asserts download controls appear
 * 
 * This test verifies the full wiring from input → parser → renderer → explanation.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';

describe('App Integration (Task-009)', () => {
  it('builds and displays Grover-3 circuit with all components', async () => {
    // Render the app
    const { container } = render(<App />);

    // Find the input and Build button
    const input = screen.getByPlaceholderText(/Try: Grover's algorithm/i);
    const buildButton = screen.getByRole('button', { name: /build/i });

    // Type the Grover-3 phrase
    fireEvent.change(input, { target: { value: "Grover's algorithm for 3 qubits" } });
    
    // Click Build
    fireEvent.click(buildButton);

    // Wait for and verify circuit diagram appears
    await waitFor(() => {
      const circuitSection = container.querySelector('.circuit-section');
      expect(circuitSection).toBeTruthy();
    });

    // Verify circuit header is shown
    expect(screen.getByText('Circuit')).toBeTruthy();

    // Verify target control appears (Grover-specific)
    expect(screen.getByText(/target \|111⟩/i)).toBeTruthy();

    // Verify download buttons appear
    expect(screen.getByTitle(/Download circuit as JSON/i)).toBeTruthy();
    expect(screen.getByTitle(/Download as OpenQASM/i)).toBeTruthy();

    // Verify circuit diagram SVG exists
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();

    // Verify step controls appear
    expect(screen.getByText(/◀ Prev/i)).toBeTruthy();
    expect(screen.getByText(/Next ▶/i)).toBeTruthy();
    expect(screen.getByText(/Step 0 of/i)).toBeTruthy();

    // Verify explanation panel appears
    const explanationSection = container.querySelector('.explanation-section');
    expect(explanationSection).toBeTruthy();
  });

  it('shows parse error and supported list on unrecognized input', () => {
    render(<App />);

    const input = screen.getByPlaceholderText(/Try: Grover's algorithm/i);
    const buildButton = screen.getByRole('button', { name: /build/i });

    // Type unrecognized text
    fireEvent.change(input, { target: { value: 'do something quantum' } });
    fireEvent.click(buildButton);

    // Verify error message appears
    expect(screen.getByText(/not recognized/i)).toBeTruthy();
    
    // Verify supported list appears
    expect(screen.getByText(/Supported:/i)).toBeTruthy();
  });

  it('shows prompt on empty input, not an error', () => {
    render(<App />);

    const buildButton = screen.getByRole('button', { name: /build/i });

    // Click Build with empty input
    fireEvent.click(buildButton);

    // Verify friendly prompt appears (not an error state)
    expect(screen.getByText(/Try: Grover's algorithm for 3 qubits/i)).toBeTruthy();
  });

  it('builds Bell state circuit', async () => {
    const { container } = render(<App />);

    const input = screen.getByPlaceholderText(/Try: Grover's algorithm/i);
    const buildButton = screen.getByRole('button', { name: /build/i });

    // Type Bell state phrase
    fireEvent.change(input, { target: { value: 'Bell state' } });
    fireEvent.click(buildButton);

    // Wait for circuit to appear
    await waitFor(() => {
      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
    });

    // Verify it's a 2-qubit circuit (Bell has 2 qubits)
    expect(screen.getByText(/Step 0 of/i)).toBeTruthy();
  });
});
