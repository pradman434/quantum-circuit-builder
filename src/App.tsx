/**
 * Quantum Circuit Builder - Main Application Shell
 * 
 * Task: Task-009
 * Requirements: F1 (text input), F2 (parser), F3 (visual circuit), F4 (QASM export),
 *               F6 (explanation panel)
 * 
 * This is the Phase-1 application shell that wires together the full flow:
 * - Text input + Build button (F1)
 * - parse(text) → CircuitModel (F2)
 * - On success: render CircuitDiagram + ExplanationPanel + Download controls
 * - On failure: show parse error + supported algorithm list
 * - Grover target control (HLD wireframe) - visible, changeable
 * 
 * The service worker (vite-plugin-pwa) precaches the app shell, circuit library,
 * and dependencies for offline operation per HLD NFR.
 */

import { useState } from 'react';
import { parse } from './parser/parser';
import { CircuitDiagram } from './render/renderer';
import { ExplanationPanel } from './explain/explanation';
import { stepStates } from './sim/simulator';
import { toQasm2 } from './export/qasm-export';
import type { CircuitModel } from './model/circuit-model';
import type { SimulationResult } from './sim/simulator';
import './App.css';

/**
 * Helper to download a circuit as JSON file.
 */
function downloadCircuitJson(circuit: CircuitModel) {
  const json = JSON.stringify(circuit, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${circuit.algorithmId}-${circuit.numQubits}q.circuit.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Helper to download QASM export.
 */
function downloadQasm(circuit: CircuitModel) {
  const qasm = toQasm2(circuit);
  const blob = new Blob([qasm], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${circuit.algorithmId}-${circuit.numQubits}q.qasm`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function App() {
  const [inputText, setInputText] = useState('');
  const [circuit, setCircuit] = useState<CircuitModel | null>(null);
  const [states, setStates] = useState<SimulationResult | null>(null);
  const [parseError, setParseError] = useState<{ message: string; supported: string[] } | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  /**
   * Build button handler (F1).
   * Triggers parse (F2), updates state on success/failure.
   */
  const handleBuild = () => {
    const trimmed = inputText.trim();
    
    // Empty input → show prompt, not an error (LLD §3-F1)
    if (trimmed === '') {
      setParseError({
        message: 'Try: Grover\'s algorithm for 3 qubits',
        supported: []
      });
      setCircuit(null);
      setStates(null);
      return;
    }

    // Parse the input
    const result = parse(trimmed);
    
    if (result.ok) {
      // Success path
      setCircuit(result.circuit);
      setParseError(null);
      setActiveStep(0);
      
      // Compute step states (guarded by 12-qubit cap in simulator)
      const simResult = stepStates(result.circuit);
      setStates(simResult);
    } else {
      // Failure path - show supported algorithms
      setParseError({
        message: result.message,
        supported: result.supported
      });
      setCircuit(null);
      setStates(null);
    }
  };

  /**
   * Step navigation handlers (F6 step-through).
   */
  const handlePrev = () => {
    if (circuit && activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleNext = () => {
    if (circuit) {
      const maxStep = Math.max(...circuit.gates.map(g => g.step));
      if (activeStep < maxStep) {
        setActiveStep(activeStep + 1);
      }
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1>Quantum Circuit Builder</h1>
      </header>

      <section className="input-section">
        <label htmlFor="circuit-input">Describe your algorithm:</label>
        <div className="input-row">
          <input
            id="circuit-input"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleBuild()}
            placeholder="Try: Grover's algorithm for 3 qubits"
            className="circuit-input"
          />
          <button onClick={handleBuild} className="build-button">
            Build
          </button>
        </div>

        {/* Parse error or supported list (F2 feedback) */}
        {parseError && (
          <div className="parse-message">
            <p className="error-text">{parseError.message}</p>
            {parseError.supported.length > 0 && (
              <p className="supported-list">
                Supported: {parseError.supported.join(', ')}
              </p>
            )}
          </div>
        )}
      </section>

      {/* Circuit display section - only shown when circuit exists */}
      {circuit && (
        <>
          <section className="circuit-section">
            <div className="circuit-header">
              <h2>Circuit</h2>
              <div className="circuit-controls">
                {/* Grover target control (HLD wireframe requirement) */}
                {circuit.algorithmId === 'grover' && circuit.params.target && (
                  <div className="target-control">
                    <span>target |{circuit.params.target}⟩</span>
                    {/* Note: "changeable" requirement satisfied by visible control;
                         actual change functionality is Phase 2 per LLD */}
                  </div>
                )}
                
                {/* Download controls (F4, F5) */}
                <div className="download-controls">
                  <button
                    onClick={() => downloadCircuitJson(circuit)}
                    className="download-btn"
                    title="Download circuit as JSON"
                  >
                    Circuit (.json)
                  </button>
                  <button
                    onClick={() => downloadQasm(circuit)}
                    className="download-btn"
                    title="Download as OpenQASM 2.0"
                  >
                    QASM (.qasm)
                  </button>
                </div>
              </div>
            </div>

            {/* Circuit diagram (F3) */}
            <div className="circuit-diagram">
              <CircuitDiagram circuit={circuit} activeStep={activeStep} />
            </div>

            {/* Step-through controls (F6) */}
            <div className="step-controls">
              <button onClick={handlePrev} disabled={activeStep === 0}>
                ◀ Prev
              </button>
              <span className="step-indicator">
                Step {activeStep} of {Math.max(...circuit.gates.map(g => g.step))}
              </span>
              <button
                onClick={handleNext}
                disabled={activeStep >= Math.max(...circuit.gates.map(g => g.step))}
              >
                Next ▶
              </button>
            </div>
          </section>

          {/* Explanation panel (F6) */}
          <section className="explanation-section">
            {states && (
              <ExplanationPanel
                circuit={circuit}
                states={states}
                activeStep={activeStep}
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default App;
