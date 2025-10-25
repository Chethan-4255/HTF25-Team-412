# EventPravesh NFT Ticketing Contract

This is a Hardhat project for the EventPravesh NFT ticketing platform built on the Nexus Layer 1 blockchain.

## Project Structure

```
├── contracts/
│   └── EventPravesh.sol          # Main NFT contract
├── scripts/
│   └── deploy.ts                 # Deployment script
├── hardhat.config.ts             # Hardhat configuration
├── .env                          # Environment variables (create this)
└── package.json                  # Dependencies
```

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory with the following variables:

```env
# Nexus Testnet Configuration
NEXUS_TESTNET_RPC_URL="https://testnet3.rpc.nexus.xyz"
DEPLOYER_PRIVATE_KEY="YOUR_WALLET_PRIVATE_KEY_HERE"

# Optional: For contract verification (if needed)
ETHERSCAN_API_KEY="YOUR_ETHERSCAN_API_KEY_HERE"
```

**Important:** Replace `YOUR_WALLET_PRIVATE_KEY_HERE` with your actual wallet private key.

### 3. Get Testnet NEX Tokens
Before deploying, you'll need NEX tokens for gas fees:
- Visit the [Nexus Testnet Faucet](https://testnet3.faucet.nexus.xyz)
- Connect your wallet and request testnet NEX tokens

### 4. Compile the Contract
```bash
npx hardhat compile
```

### 5. Deploy to Nexus Testnet
```bash
npx hardhat run scripts/deploy.js --network nexusTestnet
```

### 6. Verify Contract (Optional)
After deployment, you can verify your contract on the Nexus Explorer:
```bash
npx hardhat verify --network nexusTestnet <CONTRACT_ADDRESS> <DEPLOYER_ADDRESS>
```

## Contract Details

### EventPravesh.sol
- **Name:** EventPravesh
- **Symbol:** EP
- **Standard:** ERC721 with URI Storage
- **Features:**
  - Only owner can mint tickets (`safeMint` function)
  - Each token has a unique metadata URI
  - Auto-incrementing token IDs
  - Full ERC721 compatibility

### Key Functions
- `safeMint(address to, string memory uri)`: Mints a new ticket NFT to the specified address with the given metadata URI
- `tokenURI(uint256 tokenId)`: Returns the metadata URI for a specific token
- `owner()`: Returns the contract owner (who can mint tickets)

## Network Information

| Property        | Value                          |
| --------------- | ------------------------------ |
| Chain ID        | 3940                           |
| Native Token    | Nexus Token (NEX)              |
| RPC (HTTP)      | https://testnet3.rpc.nexus.xyz |
| RPC (WebSocket) | wss://testnet3.rpc.nexus.xyz   |
| Explorer        | https://testnet3.explorer.nexus.xyz |

## Usage Example

After deployment, you can mint tickets by calling the `safeMint` function:

```javascript
// Example: Mint a ticket to user's wallet
const tokenId = await eventPravesh.safeMint(
  "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6", // User's wallet address
  "https://api.eventpravesh.com/nft/123" // Metadata URI
);
```

## Security Notes

- The `safeMint` function is protected by `onlyOwner` modifier
- Only the contract owner can mint new tickets
- All ticket metadata is stored off-chain for privacy and cost efficiency
- The contract uses OpenZeppelin's battle-tested implementations

## Support

For more information about Nexus Layer 1, visit: https://docs.nexus.xyz/layer-1/developer/overview