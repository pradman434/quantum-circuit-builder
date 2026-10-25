/**
 * Plain-English parser for Quantum Circuit Builder.
 * 
 * Task: Task-004
 * Requirements: #2 (parser maps text to algorithms + qubit count)
 * 
 * This parser converts natural-language descriptions into CircuitModel instances.
 * It uses normalized keyword matching (never guessing) with a test matrix covering
 * phrasing variants, ambiguous inputs, and empty/invalid cases.
 * 
 * Parser specification (LLD §2.1):
 * - Normalize input: lowercase, trim, collapse whitespace, strip possessive apostrophes
 * - Extract first integer as qubit count (or use algorithm default)
 * - Match against per-algorithm keyword sets
 * - Never guess: 0 or >1 matches → return supported algorithm list
 * - Empty input → friendly prompt, not an error
 */

import type { CircuitModel } from '../model/circuit-model';
import { buildGrover, buildBell } from '../model/builders';

/**
 * Result of parsing plain-English input.
 * 
 * Success case returns a valid CircuitModel.
 * Failure case returns a clear message and the list of supported algorithms.
 */
export type ParseResult =
  | { ok: true; circuit: CircuitModel }
  | { ok: false; message: string; supported: string[] };

/**
 * Algorithm definition for keyword-based matching.
 * 
 * Each algorithm has:
 * - keywords: terms that must ALL appear in normalized input for a match
 * - label: human-readable name for the supported list
 * - defaultQubits: qubit count when none is specified
 * - build: pure function (qubits) → CircuitModel
 */
interface AlgorithmDef {
  keywords: string[];
  label: string;
  defaultQubits: number;
  build: (qubits: number) => CircuitModel;
}

/**
 * Phase 1 algorithm registry.
 * 
 * Each entry defines keyword patterns that recognize the algorithm.
 * Keywords are matched against normalized (lowercase, no apostrophes) input.
 */
const ALGORITHMS: AlgorithmDef[] = [
  {
    keywords: ["grover"],
    label: "Grover's algorithm",
    defaultQubits: 3,
    build: (qubits: number) => buildGrover(qubits)
  },
  {
    keywords: ["bell"],
    label: "Bell state",
    defaultQubits: 2,
    build: (qubits: number) => buildBell()
  }
];

/**
 * Normalizes input text for consistent matching.
 * 
 * Transformations:
 * - Convert to lowercase
 * - Trim leading/trailing whitespace
 * - Collapse multiple spaces to single space
 * - Remove possessive apostrophes ("grover's" → "grovers")
 * 
 * @param text - Raw user input
 * @returns Normalized string for keyword matching
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')           // Collapse whitespace
    .replace(/'/g, '');              // Strip apostrophes
}

/**
 * Extracts the first integer from a string.
 * 
 * Used to parse qubit count from phrases like "Grover for 3 qubits" or "grover 3q".
 * Matches negative integers too (e.g., "-5" → -5).
 * 
 * @param text - Normalized input
 * @returns First integer found, or null if none
 */
function extractFirstInteger(text: string): number | null {
  const match = text.match(/-?\d+/);
  return match ? parseInt(match[0], 10) : null;
}

/**
 * Builds a "not recognized" error message with supported algorithm list.
 * 
 * @param algorithms - Full algorithm registry
 * @returns User-friendly error message
 */
function notRecognizedMessage(algorithms: AlgorithmDef[]): string {
  const labels = algorithms.map(a => a.label).join(', ');
  return `Algorithm not recognized. Supported algorithms: ${labels}`;
}

/**
 * Parses plain-English text into a CircuitModel.
 * 
 * Algorithm:
 * 1. Return early on empty/whitespace-only input with example prompt
 * 2. Normalize input (lowercase, strip apostrophes, collapse whitespace)
 * 3. Extract first integer as qubit count (may be null)
 * 4. Find all algorithms whose keywords ALL appear in normalized input
 * 5. If 0 or >1 matches, return not-recognized message with supported list
 * 6. If exactly 1 match, use extracted qubit count or algorithm default
 * 7. Validate qubit count is in range [1, 24]
 * 8. Call algorithm builder and return the circuit
 * 
 * @param text - User's plain-English description
 * @returns ParseResult with circuit or error details
 */
export function parse(text: string): ParseResult {
  // Handle empty/whitespace input with friendly prompt
  const trimmed = text.trim();
  if (trimmed === '') {
    return {
      ok: false,
      message: "Please describe an algorithm. Try: Grover's algorithm for 3 qubits",
      supported: ALGORITHMS.map(a => a.label)
    };
  }

  // Normalize input for consistent matching
  const normalized = normalize(text);

  // Extract qubit count from the input (first integer found)
  const explicitQubits = extractFirstInteger(normalized);

  // Find matching algorithms (all keywords must appear)
  const matches = ALGORITHMS.filter(alg =>
    alg.keywords.every(keyword => normalized.includes(keyword))
  );

  // Never guess: exactly 1 match required
  if (matches.length === 0) {
    return {
      ok: false,
      message: notRecognizedMessage(ALGORITHMS),
      supported: ALGORITHMS.map(a => a.label)
    };
  }

  if (matches.length > 1) {
    const matchedLabels = matches.map(m => m.label).join(', ');
    return {
      ok: false,
      message: `Ambiguous input matches multiple algorithms: ${matchedLabels}. Please be more specific.`,
      supported: ALGORITHMS.map(a => a.label)
    };
  }

  // Exactly one match - proceed with building
  const algorithm = matches[0];
  const qubits = explicitQubits ?? algorithm.defaultQubits;

  // Validate qubit count range [1, 24] per LLD constraint
  if (qubits < 1 || qubits > 24) {
    return {
      ok: false,
      message: `Qubit count must be between 1 and 24, got ${qubits}`,
      supported: ALGORITHMS.map(a => a.label)
    };
  }

  // Build the circuit
  // Note: buildGrover only supports 3 qubits with |111⟩ target in Phase 1
  // For other counts, it will throw - we catch that and return a clear message
  try {
    const circuit = algorithm.build(qubits);
    return { ok: true, circuit };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      message: `Cannot build circuit: ${errorMsg}`,
      supported: ALGORITHMS.map(a => a.label)
    };
  }
}
