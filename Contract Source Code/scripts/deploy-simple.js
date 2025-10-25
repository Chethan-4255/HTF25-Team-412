import { ethers } from "ethers";
import "dotenv/config";

async function main() {
  // Create provider and wallet
  const provider = new ethers.JsonRpcProvider(process.env.NEXUS_TESTNET_RPC_URL);
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  
  console.log("Deploying contract with the account:", wallet.address);
  
  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log("Account balance:", ethers.formatEther(balance), "NEX");

  // Read contract bytecode and ABI from artifacts
  const fs = await import('fs');
  const path = await import('path');
  
  const artifactsPath = path.join(process.cwd(), 'artifacts', 'contracts', 'EventPravesh.sol', 'EventPravesh.json');
  const contractArtifact = JSON.parse(fs.readFileSync(artifactsPath, 'utf8'));
  
  const factory = new ethers.ContractFactory(
    contractArtifact.abi,
    contractArtifact.bytecode,
    wallet
  );

  // Deploy the contract
  console.log("Deploying EventPravesh contract...");
  const contract = await factory.deploy();
  
  console.log("Transaction hash:", contract.deploymentTransaction().hash);
  console.log("Waiting for deployment...");
  
  await contract.waitForDeployment();
  
  const contractAddress = await contract.getAddress();
  console.log(`EventPravesh contract deployed to: ${contractAddress}`);
  console.log(`Explorer: https://testnet3.explorer.nexus.xyz/address/${contractAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
