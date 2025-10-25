// Verification script for Nexus Testnet
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Contract address to verify
const contractAddress = '0x80948605d70Ffe40786AafC68c24bfd1a786B59D';

// Get the contract source code
const contractPath = path.join(process.cwd(), 'contracts', 'EventPravesh.sol');
const contractSource = fs.readFileSync(contractPath, 'utf8');

console.log('Starting verification process...');
console.log(`Contract address: ${contractAddress}`);

try {
  // Use curl to directly submit verification request to the explorer API
  const command = `curl -X POST "https://explorer-api.nexus.io/api" \
    -H "Content-Type: application/json" \
    --data '{"apikey": "I5CS9FMU7Z545B1E4XS8GQ7T3PNJH2C5J7", \
    "module": "contract", \
    "action": "verifysourcecode", \
    "contractaddress": "${contractAddress}", \
    "sourceCode": ${JSON.stringify(contractSource)}, \
    "codeformat": "solidity-single-file", \
    "contractname": "EventPravesh", \
    "compilerversion": "v0.8.20+commit.a1b79de6", \
    "optimizationUsed": 1, \
    "runs": 200, \
    "constructorArguments": ""}'`;

  console.log('Executing verification request...');
  const result = execSync(command, { encoding: 'utf8' });
  console.log('Verification result:');
  console.log(result);
} catch (error) {
  console.error('Verification failed:');
  console.error(error.message);
}