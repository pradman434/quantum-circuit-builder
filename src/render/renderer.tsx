/**
 * SVG circuit renderer for Quantum Circuit Builder.
 * 
 * Task: Task-005
 * Requirements: #3 (visual circuit diagram with wires, gates, and step-through)
 * 
 * This is a thin in-house SVG layer that reads CircuitModel.gates directly
 * and draws:
 * - One horizontal wire per qubit
 * - Gate boxes positioned left-to-right by gate.step (time order)
 * - Control dots + connecting lines for multi-qubit gates (cx, ccx)
 * - A highlight band over the activeStep column
 * 
 * Does NOT depend on the quantum-circuit library's own SVG output.
 * All rendering logic is self-contained here.
 */

import React from 'react';
import type { CircuitModel, Gate } from '../model/circuit-model';

/**
 * Circuit diagram component props.
 * 
 * @property circuit - The circuit model to render
 * @property activeStep - Which time step (column) to highlight (0-indexed)
 */
export interface CircuitDiagramProps {
  circuit: CircuitModel;
  activeStep: number;
}

// Layout constants
const WIRE_Y_SPACING = 80;      // Vertical spacing between qubit wires
const STEP_X_SPACING = 100;     // Horizontal spacing between time steps
const GATE_WIDTH = 40;          // Width of gate boxes
const GATE_HEIGHT = 40;         // Height of gate boxes
const MARGIN_LEFT = 60;         // Left margin for qubit labels
const MARGIN_TOP = 40;          // Top margin
const CONTROL_DOT_RADIUS = 6;   // Radius of control dots
const HIGHLIGHT_PADDING = 10;   // Padding around highlighted column

/**
 * Get the Y coordinate for a qubit wire.
 */
function getWireY(qubitIndex: number): number {
  return MARGIN_TOP + qubitIndex * WIRE_Y_SPACING;
}

/**
 * Get the X coordinate for a time step (column).
 */
function getStepX(step: number): number {
  return MARGIN_LEFT + step * STEP_X_SPACING;
}

/**
 * Render a single-qubit gate (H, X, Y, Z).
 */
function renderSingleQubitGate(gate: Gate, step: number): JSX.Element {
  const x = getStepX(step) - GATE_WIDTH / 2;
  const y = getWireY(gate.targets[0]) - GATE_HEIGHT / 2;
  
  // Gate box
  const rect = (
    <rect
      key={`gate-box-${step}-${gate.targets[0]}`}
      x={x}
      y={y}
      width={GATE_WIDTH}
      height={GATE_HEIGHT}
      fill="lightblue"
      stroke="navy"
      strokeWidth={2}
      rx={4}
    />
  );
  
  // Gate label (uppercase gate name)
  const label = (
    <text
      key={`gate-label-${step}-${gate.targets[0]}`}
      x={getStepX(step)}
      y={getWireY(gate.targets[0])}
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={18}
      fontWeight="bold"
      fill="navy"
    >
      {gate.name.toUpperCase()}
    </text>
  );
  
  return <g key={`single-${step}-${gate.targets[0]}`}>{rect}{label}</g>;
}

/**
 * Render a controlled gate (CX, CCX).
 * Draws control dots on control qubits and a target box on the target qubit,
 * with connecting lines.
 */
function renderControlledGate(gate: Gate, step: number): JSX.Element {
  const elements: JSX.Element[] = [];
  const x = getStepX(step);
  const targetQubit = gate.targets[0];
  const targetY = getWireY(targetQubit);
  
  // Determine the min/max Y for the connecting line
  const allQubits = [...gate.controls, targetQubit];
  const minQubit = Math.min(...allQubits);
  const maxQubit = Math.max(...allQubits);
  const minY = getWireY(minQubit);
  const maxY = getWireY(maxQubit);
  
  // Draw vertical connecting line from topmost to bottommost qubit
  elements.push(
    <line
      key={`connect-line-${step}`}
      x1={x}
      y1={minY}
      x2={x}
      y2={maxY}
      stroke="navy"
      strokeWidth={2}
    />
  );
  
  // Draw control dots on each control qubit
  gate.controls.forEach((controlQubit, idx) => {
    const cy = getWireY(controlQubit);
    elements.push(
      <circle
        key={`control-dot-${step}-${controlQubit}-${idx}`}
        cx={x}
        cy={cy}
        r={CONTROL_DOT_RADIUS}
        fill="navy"
        stroke="navy"
        strokeWidth={1}
      />
    );
  });
  
  // Draw target gate box (X for CX/CCX, or a plus symbol for visual distinction)
  const targetBoxX = x - GATE_WIDTH / 2;
  const targetBoxY = targetY - GATE_HEIGHT / 2;
  
  elements.push(
    <rect
      key={`target-box-${step}-${targetQubit}`}
      x={targetBoxX}
      y={targetBoxY}
      width={GATE_WIDTH}
      height={GATE_HEIGHT}
      fill="lightcoral"
      stroke="darkred"
      strokeWidth={2}
      rx={4}
    />
  );
  
  // Draw target label (gate name or ⊕ for visual variety)
  // Using the gate name for clarity (CX, CCX)
  elements.push(
    <text
      key={`target-label-${step}-${targetQubit}`}
      x={x}
      y={targetY}
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={gate.name === 'ccx' ? 14 : 18}
      fontWeight="bold"
      fill="darkred"
    >
      {gate.name.toUpperCase()}
    </text>
  );
  
  return <g key={`controlled-${step}-${targetQubit}`}>{elements}</g>;
}

/**
 * Render a single gate element.
 */
function renderGate(gate: Gate, step: number): JSX.Element {
  // Controlled gates (cx, ccx)
  if (gate.controls.length > 0) {
    return renderControlledGate(gate, step);
  }
  
  // Single-qubit gates (h, x, y, z)
  return renderSingleQubitGate(gate, step);
}

/**
 * Main circuit diagram component.
 * 
 * Renders:
 * - Horizontal qubit wires
 * - Gate symbols positioned by step (time order)
 * - Control dots + lines for multi-qubit gates
 * - Highlight band on the active step column
 * 
 * @param props - Circuit and active step
 * @returns SVG diagram as a React component
 */
export function CircuitDiagram({ circuit, activeStep }: CircuitDiagramProps): JSX.Element {
  const { numQubits, gates } = circuit;
  
  // Compute diagram dimensions
  const maxStep = gates.length > 0 ? Math.max(...gates.map(g => g.step)) : 0;
  const svgWidth = MARGIN_LEFT + (maxStep + 1) * STEP_X_SPACING + 100;
  const svgHeight = MARGIN_TOP + numQubits * WIRE_Y_SPACING + 40;
  
  return (
    <svg
      width={svgWidth}
      height={svgHeight}
      style={{ border: '1px solid #ccc', backgroundColor: 'white' }}
    >
      {/* Highlight band for active step */}
      {activeStep >= 0 && activeStep <= maxStep && (
        <rect
          x={getStepX(activeStep) - STEP_X_SPACING / 2 + HIGHLIGHT_PADDING}
          y={0}
          width={STEP_X_SPACING - 2 * HIGHLIGHT_PADDING}
          height={svgHeight}
          fill="yellow"
          opacity={0.2}
        />
      )}
      
      {/* Qubit wires */}
      {Array.from({ length: numQubits }, (_, q) => {
        const y = getWireY(q);
        return (
          <g key={`qubit-${q}`}>
            {/* Qubit label */}
            <text
              x={20}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={16}
              fontWeight="bold"
              fill="black"
            >
              q{q}
            </text>
            {/* Wire line */}
            <line
              x1={MARGIN_LEFT - 20}
              y1={y}
              x2={svgWidth - 50}
              y2={y}
              stroke="black"
              strokeWidth={1}
            />
          </g>
        );
      })}
      
      {/* Gates */}
      {gates.map((gate, idx) => renderGate(gate, gate.step))}
    </svg>
  );
}
