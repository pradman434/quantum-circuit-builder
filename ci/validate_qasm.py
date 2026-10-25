#!/usr/bin/env python3
"""
OpenQASM 2.0 validation script for Quantum Circuit Builder CI.

Task: Task-008
Requirements: #4 (export to OpenQASM 2.0) + HLD CRITICAL-1
LLD: §2.9, §4.4

This script validates that a .qasm file is valid OpenQASM 2.0 by parsing it
with an INDEPENDENT parser (Qiskit QuantumCircuit.from_qasm_file/from_qasm_str).

This enforces HLD CRITICAL-1: the exported QASM MUST be checked against an
independent parser, NOT the circuit library's own importer, to prove the output
parses as valid OpenQASM 2.0 by the spec, not just by our library's looser rules.

Usage:
    python ci/validate_qasm.py <file.qasm>
    python ci/validate_qasm.py --stdin < file.qasm

Exit codes:
    0 - QASM parsed successfully with zero errors
    1 - Parse error or other validation failure
    2 - File not found or I/O error
    3 - Missing arguments or usage error
"""

import sys
import argparse
from pathlib import Path


def validate_qasm_file(filepath: Path) -> int:
    """
    Validate a QASM file by parsing it with Qiskit.
    
    Args:
        filepath: Path to the .qasm file to validate
        
    Returns:
        0 if valid, 1 if parse error, 2 if I/O error
    """
    try:
        # Import Qiskit here so the import error is clear if it's missing
        from qiskit import QuantumCircuit
    except ImportError:
        print("ERROR: Qiskit is not installed. Install with: pip install qiskit", file=sys.stderr)
        return 2
    
    if not filepath.exists():
        print(f"ERROR: File not found: {filepath}", file=sys.stderr)
        return 2
    
    try:
        # Parse the QASM file with Qiskit (independent parser)
        circuit = QuantumCircuit.from_qasm_file(str(filepath))
        
        # If we got here, parsing succeeded
        print(f"✓ Valid OpenQASM 2.0: {filepath}")
        print(f"  Circuit: {circuit.num_qubits} qubits, {len(circuit.data)} gates")
        return 0
        
    except Exception as e:
        # Any exception during parsing means the QASM is invalid
        print(f"✗ Parse error in {filepath}:", file=sys.stderr)
        print(f"  {type(e).__name__}: {e}", file=sys.stderr)
        return 1


def validate_qasm_string(qasm_text: str) -> int:
    """
    Validate QASM text by parsing it with Qiskit.
    
    Args:
        qasm_text: OpenQASM 2.0 text to validate
        
    Returns:
        0 if valid, 1 if parse error
    """
    try:
        from qiskit import QuantumCircuit
    except ImportError:
        print("ERROR: Qiskit is not installed. Install with: pip install qiskit", file=sys.stderr)
        return 2
    
    try:
        circuit = QuantumCircuit.from_qasm_str(qasm_text)
        
        print(f"✓ Valid OpenQASM 2.0 (from stdin)")
        print(f"  Circuit: {circuit.num_qubits} qubits, {len(circuit.data)} gates")
        return 0
        
    except Exception as e:
        print(f"✗ Parse error:", file=sys.stderr)
        print(f"  {type(e).__name__}: {e}", file=sys.stderr)
        return 1


def main() -> int:
    """
    Main entry point for the validator.
    
    Returns:
        Exit code (0=success, 1=parse error, 2=I/O error, 3=usage error)
    """
    parser = argparse.ArgumentParser(
        description="Validate OpenQASM 2.0 files using Qiskit (independent parser)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python ci/validate_qasm.py grover-3.qasm
  python ci/validate_qasm.py --stdin < bell.qasm
  python ci/validate_qasm.py *.qasm

Exit codes:
  0 - All files parsed successfully
  1 - Parse error in one or more files
  2 - File not found or I/O error
  3 - Missing arguments or usage error
        """
    )
    
    parser.add_argument(
        'files',
        nargs='*',
        type=Path,
        help='QASM file(s) to validate'
    )
    
    parser.add_argument(
        '--stdin',
        action='store_true',
        help='Read QASM from stdin instead of files'
    )
    
    args = parser.parse_args()
    
    # Validate input
    if args.stdin:
        if args.files:
            print("ERROR: Cannot specify both --stdin and file arguments", file=sys.stderr)
            return 3
        
        # Read from stdin
        qasm_text = sys.stdin.read()
        return validate_qasm_string(qasm_text)
    
    if not args.files:
        parser.print_help()
        return 3
    
    # Validate each file
    all_valid = True
    for filepath in args.files:
        result = validate_qasm_file(filepath)
        if result != 0:
            all_valid = False
    
    return 0 if all_valid else 1


if __name__ == '__main__':
    sys.exit(main())
