const QuantumCircuit = require('quantum-circuit');

const qc = new QuantumCircuit(2);
qc.addGate('h', -1, 0);
qc.addGate('cx', -1, [0, 1]);

console.log('numQubits:', qc.numQubits);
console.log('numCols:', qc.numCols());
console.log('gates structure:', JSON.stringify(qc.gates, null, 2));

