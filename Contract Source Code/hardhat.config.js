require("dotenv").config();
require("@nomiclabs/hardhat-etherscan");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    nexusTestnet: {
      url: "https://testnet3.rpc.nexus.xyz",
      chainId: 3940,
      accounts: process.env.DEPLOYER_PRIVATE_KEY !== undefined
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
    },
  },
  etherscan: {
    apiKey: "I5CS9FMU7Z545B1E4XS8GQ7T3PNJH2C5J7",
    customChains: [
      {
        network: "nexusTestnet",
        chainId: 3940,
        urls: {
          apiURL: "https://testnet3.explorer.nexus.xyz/api",
          browserURL: "https://testnet3.explorer.nexus.xyz"
        }
      }
    ]
  },
};
