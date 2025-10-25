import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contract with the account:", deployer.address);

  const EventPravesh = await ethers.getContractFactory("EventPravesh");
  const eventPravesh = await EventPravesh.deploy(deployer.address);

  await eventPravesh.waitForDeployment();

  const contractAddress = await eventPravesh.getAddress();
  console.log(`EventPravesh contract deployed to: ${contractAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
