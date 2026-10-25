/**
 * Minimal ambient type declaration for the untyped `quantum-circuit` npm library.
 *
 * The library ships no types. The adapter in src/lib/lib-adapter.ts is the only
 * module that touches it, so we declare it as a loose module here to satisfy the
 * production build (`tsc -b`) without pretending to type the whole API surface.
 */
declare module 'quantum-circuit' {
  const QuantumCircuit: any;
  export default QuantumCircuit;
  export type QuantumCircuit = any;
}
