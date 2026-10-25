# CI - Independent QASM Validation

**Task:** Task-008  
**Requirements:** #4 (export to OpenQASM 2.0) + HLD CRITICAL-1  
**LLD:** §2.9, §4.4

## Purpose

This directory contains the **independent QASM validation gate** that enforces HLD CRITICAL-1: exported OpenQASM 2.0 output must parse correctly with an independent parser, not just with the circuit library's own importer.

## Why Independent Validation?

The app uses the `quantastica/quantum-circuit` library to generate QASM output. However, if we only validated QASM by re-importing it with the same library, we would miss two critical failures:

1. **Non-standard QASM**: The library might produce output that works with its own parser but violates the OpenQASM 2.0 spec
2. **Library bugs**: A bug in the library's exporter might be masked by a matching bug in its importer

By validating against **Qiskit's independent OpenQASM 2.0 parser**, we prove the exported QASM conforms to the actual specification and will work in other quantum computing tools.

## Files

### `validate_qasm.py`
The validation script. Takes one or more `.qasm` files and parses them with Qiskit's `QuantumCircuit.from_qasm_file()`.

**Usage:**
```bash
python ci/validate_qasm.py file.qasm
python ci/validate_qasm.py --stdin < file.qasm
python ci/validate_qasm.py *.qasm
```

**Exit codes:**
- `0` - All files parsed successfully (valid OpenQASM 2.0)
- `1` - Parse error in one or more files
- `2` - File not found or I/O error
- `3` - Missing arguments or usage error

### `test_validator.py`
Unit tests for the validator script itself. Proves:
- Valid QASM passes (tested on golden Grover-3 and Bell fixtures)
- Malformed QASM is rejected (missing header, invalid gates)
- Exit codes are correct

**Usage:**
```bash
python ci/test_validator.py
```

## CI Integration

The validation gate runs automatically on every push and PR via `.github/workflows/ci.yml`:

1. Runs JavaScript tests (`npm test`)
2. Sets up Python and installs Qiskit
3. Validates the golden QASM fixtures with the independent parser
4. Fails the build if any QASM file has parse errors

## Local Testing

To run the validation locally:

```bash
# Install Qiskit in a venv
python3 -m venv qiskit-venv
source qiskit-venv/bin/activate  # or `qiskit-venv\Scripts\activate` on Windows
pip install qiskit

# Validate golden fixtures
python ci/validate_qasm.py src/export/__tests__/fixtures/grover-3.qasm
python ci/validate_qasm.py src/export/__tests__/fixtures/bell.qasm

# Run validator unit tests
python ci/test_validator.py
```

Expected output:
```
✓ Valid OpenQASM 2.0: src/export/__tests__/fixtures/grover-3.qasm
  Circuit: 3 qubits, 21 gates
✓ Valid OpenQASM 2.0: src/export/__tests__/fixtures/bell.qasm
  Circuit: 2 qubits, 2 gates
```

## What This Proves

This CI gate proves that:

1. **The QASM exporter produces valid OpenQASM 2.0** (not just library-specific output)
2. **The exported QASM will work in other tools** (Qiskit, IBMQ, other quantum simulators)
3. **A library bug or version change that breaks QASM export will fail CI** before it ships

This is the acceptance criterion for Requirements #4: "Export button produces a text file that parses as valid OpenQASM 2.0 (verified by a QASM 2.0 parser with zero errors)."
