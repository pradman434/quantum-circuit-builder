import QuantumCircuit from 'quantum-circuit';

const qc = new QuantumCircuit(2);
qc.addGate('h', -1, 0);
qc.addGate('cx', -1, [0, 1]);

console.log('numQubits:', qc.numQubits);
console.log('numCols:', qc.numCols());
console.log('gates[0]:', qc.gates[0]);
console.log('gates[1]:', qc.gates[1]);

if (qc.gates[1] && qc.gates[1][1]) {
  console.log('CX gate data:', qc.gates[1][1]);
}

