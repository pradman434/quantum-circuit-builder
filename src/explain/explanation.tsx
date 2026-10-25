/**
 * Explanation panel component for interactive circuit explanations.
 * 
 * Task: Task-007
 * Requirements: #6 (interactive explanations - plain-English + math)
 * 
 * This module renders the ExplanationPanel that displays:
 * 1. Plain-English explanation of what the algorithm does (Phase 1, always shown)
 * 2. Gate matrices and per-step quantum state via KaTeX when states are available (Phase 2)
 * 3. A cap note when state simulation is unavailable (numQubits > 12)
 * 4. A "Learn more →" link when a reference URL exists for the algorithm
 * 5. DEGRADED MODE: If KaTeX fails to load, renders raw matrix/state text instead of crashing
 * 
 * The component accepts a circuit model, simulation results (or unavailable marker),
 * and the currently active step for the step-through feature.
 */

import React, { useEffect, useRef, useState } from 'react';
import type { CircuitModel } from '../model/circuit-model.js';
import type { StepState } from '../sim/simulator.js';

/**
 * Props for the ExplanationPanel component.
 */
export interface ExplanationPanelProps {
  /** The circuit being explained */
  circuit: CircuitModel;
  
  /** Simulation results: either step-by-step states or unavailable marker */
  states: StepState[] | { unavailable: true; reason: string };
  
  /** Currently active step index for highlighting (0 = initial, 1 = after first column, etc.) */
  activeStep: number;
}

/**
 * Plain-English explanations per algorithm.
 * Phase 1 covers Grover and Bell; Phase 2 will add more.
 */
const PLAIN_ENGLISH: Record<string, string> = {
  grover: `Grover's algorithm searches an unsorted database quadratically faster than classical algorithms. 
It starts by putting all qubits into equal superposition (every state equally likely), then repeatedly applies 
an oracle that marks the target state and a diffusion operator that amplifies the marked state's amplitude. 
After one iteration, the target state has significantly higher probability than the others.`,
  
  bell: `The Bell state creates maximum quantum entanglement between two qubits. Starting from |00⟩, 
a Hadamard gate puts the first qubit into superposition, then a CNOT gate entangles it with the second qubit. 
The result is (|00⟩ + |11⟩)/√2, where measuring one qubit instantly determines the other's state, 
demonstrating quantum correlation stronger than any classical correlation.`
};

/**
 * Gate matrix representations for display.
 * Maps gate names to their matrix strings (LaTeX format for KaTeX, plain text for degraded mode).
 */
const GATE_MATRIX: Record<string, { latex: string; plain: string }> = {
  h: {
    latex: '\\frac{1}{\\sqrt{2}}\\begin{bmatrix}1 & 1\\\\1 & -1\\end{bmatrix}',
    plain: '(1/√2)·[1  1]\n       [1 -1]'
  },
  x: {
    latex: '\\begin{bmatrix}0 & 1\\\\1 & 0\\end{bmatrix}',
    plain: '[0 1]\n[1 0]'
  },
  z: {
    latex: '\\begin{bmatrix}1 & 0\\\\0 & -1\\end{bmatrix}',
    plain: '[1  0]\n[0 -1]'
  },
  cx: {
    latex: '\\begin{bmatrix}1 & 0 & 0 & 0\\\\0 & 1 & 0 & 0\\\\0 & 0 & 0 & 1\\\\0 & 0 & 1 & 0\\end{bmatrix}',
    plain: '[1 0 0 0]\n[0 1 0 0]\n[0 0 0 1]\n[0 0 1 0]'
  },
  ccx: {
    latex: '\\text{8×8 identity except flipping } |110\\rangle \\leftrightarrow |111\\rangle',
    plain: '8×8 identity except flipping |110⟩ ↔ |111⟩'
  }
};

/**
 * External reference URLs per algorithm.
 * When absent, the "Learn more" link is hidden.
 * PM will supply these URLs; until then they're stubbed.
 */
const LEARN_MORE_URLS: Record<string, string | undefined> = {
  grover: undefined,  // PM to supply
  bell: undefined     // PM to supply
};

/**
 * Checks if KaTeX is available and working.
 * This is how we detect the degraded-mode condition.
 */
function isKaTeXAvailable(): boolean {
  try {
    // Attempt to import KaTeX - if it fails, we're in degraded mode
    // In production, this would be a dynamic import check
    // For now, we check if the module is loadable
    return typeof window !== 'undefined' && 'katex' in window;
  } catch {
    return false;
  }
}

/**
 * Renders a mathematical expression using KaTeX if available, or raw text otherwise.
 */
function MathDisplay({ latex, plain }: { latex: string; plain: string }): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [degraded, setDegraded] = useState(false);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Try to render with KaTeX
    const renderKaTeX = async () => {
      try {
        const katex = await import('katex');
        await import('katex/dist/katex.min.css');
        
        if (containerRef.current) {
          katex.default.render(latex, containerRef.current, {
            displayMode: true,
            throwOnError: false
          });
        }
      } catch (error) {
        // KaTeX failed - enter degraded mode
        console.warn('KaTeX unavailable, using plain text fallback:', error);
        setDegraded(true);
      }
    };
    
    renderKaTeX();
  }, [latex, plain]);
  
  if (degraded) {
    return (
      <pre style={{ 
        fontFamily: 'monospace', 
        whiteSpace: 'pre', 
        margin: '10px 0',
        fontSize: '14px' 
      }}>
        {plain}
      </pre>
    );
  }
  
  return <div ref={containerRef} style={{ margin: '10px 0' }} />;
}

/**
 * Formats a quantum state vector as a ket string.
 * Shows only terms with significant amplitude (|amplitude| > 1e-10).
 */
function formatStateVector(amplitudes: Array<{ basis: string; re: number; im: number }>): string {
  const significantTerms = amplitudes
    .filter(({ re, im }) => Math.abs(re) > 1e-10 || Math.abs(im) > 1e-10)
    .map(({ basis, re, im }) => {
      const magnitude = Math.sqrt(re * re + im * im);
      const sign = re >= 0 ? '+' : '';
      
      // Format amplitude
      let ampStr = '';
      if (Math.abs(magnitude - 1) < 1e-10) {
        ampStr = '';  // Coefficient is 1
      } else if (Math.abs(im) < 1e-10) {
        // Real only
        ampStr = `${sign}${re.toFixed(4)}`;
      } else {
        // Complex
        ampStr = `${sign}(${re.toFixed(4)}${im >= 0 ? '+' : ''}${im.toFixed(4)}i)`;
      }
      
      return `${ampStr}|${basis}⟩`;
    });
  
  if (significantTerms.length === 0) {
    return '|0⟩';
  }
  
  return significantTerms.join(' ').replace(/^\+/, '');  // Remove leading +
}

/**
 * Gets the gate at the current active step, if any.
 */
function getActiveGate(circuit: CircuitModel, activeStep: number) {
  // activeStep 0 = initial state (no gate yet)
  // activeStep i = state after step i-1
  if (activeStep === 0) return null;
  
  const stepIndex = activeStep - 1;
  return circuit.gates.find(g => g.step === stepIndex);
}

/**
 * ExplanationPanel component.
 * 
 * Displays plain-English explanation, gate matrices, quantum states, and external links
 * for the current circuit and active step. Handles degraded mode when KaTeX is unavailable.
 */
export function ExplanationPanel({ circuit, states, activeStep }: ExplanationPanelProps): JSX.Element {
  const plainEnglish = PLAIN_ENGLISH[circuit.algorithmId] || 
    `This is a ${circuit.algorithmLabel}. Details coming soon.`;
  
  const learnMoreUrl = LEARN_MORE_URLS[circuit.algorithmId];
  const isUnavailable = 'unavailable' in states && states.unavailable;
  
  // Get current gate (if activeStep > 0)
  const activeGate = getActiveGate(circuit, activeStep);
  
  return (
    <div style={{ 
      border: '1px solid #ccc', 
      padding: '20px', 
      marginTop: '20px',
      borderRadius: '8px',
      backgroundColor: '#f9f9f9'
    }}>
      <h2>Explanation</h2>
      
      {/* Plain-English explanation (Phase 1 - always shown) */}
      <section>
        <h3>What this algorithm does</h3>
        <p>{plainEnglish}</p>
      </section>
      
      {/* State unavailable message when above simulation cap */}
      {isUnavailable && (
        <section style={{ marginTop: '20px' }}>
          <p style={{ 
            color: '#666', 
            fontStyle: 'italic',
            padding: '10px',
            backgroundColor: '#fff3cd',
            borderLeft: '4px solid #ffc107',
            borderRadius: '4px'
          }}>
            {states.reason}
          </p>
        </section>
      )}
      
      {/* Gate matrix and state (Phase 2 - when states are available) */}
      {!isUnavailable && activeGate && (
        <section style={{ marginTop: '20px' }}>
          <h3>Step {activeStep}: {activeGate.name.toUpperCase()} gate</h3>
          
          {GATE_MATRIX[activeGate.name] && (
            <div>
              <h4>Gate Matrix</h4>
              <MathDisplay 
                latex={GATE_MATRIX[activeGate.name].latex}
                plain={GATE_MATRIX[activeGate.name].plain}
              />
            </div>
          )}
          
          {Array.isArray(states) && states[activeStep] && (
            <div style={{ marginTop: '15px' }}>
              <h4>State after this step</h4>
              <pre style={{ 
                fontFamily: 'monospace',
                fontSize: '14px',
                backgroundColor: 'white',
                padding: '10px',
                borderRadius: '4px',
                overflowX: 'auto'
              }}>
                {formatStateVector(states[activeStep].amplitudes)}
              </pre>
            </div>
          )}
        </section>
      )}
      
      {/* Initial state display when at step 0 */}
      {!isUnavailable && activeStep === 0 && Array.isArray(states) && states[0] && (
        <section style={{ marginTop: '20px' }}>
          <h3>Initial State</h3>
          <pre style={{ 
            fontFamily: 'monospace',
            fontSize: '14px',
            backgroundColor: 'white',
            padding: '10px',
            borderRadius: '4px',
            overflowX: 'auto'
          }}>
            {formatStateVector(states[0].amplitudes)}
          </pre>
        </section>
      )}
      
      {/* Learn more link (hidden when URL is absent) */}
      {learnMoreUrl && (
        <section style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #ddd' }}>
          <a 
            href={learnMoreUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              fontSize: '16px',
              color: '#0066cc',
              textDecoration: 'none',
              fontWeight: 'bold'
            }}
          >
            Learn more about {circuit.algorithmLabel} →
          </a>
        </section>
      )}
    </div>
  );
}
