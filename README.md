# 🤖 Radix Agent Kit

[![NPM Version](https://img.shields.io/npm/v/radix-agent-kit?style=for-the-badge)](https://www.npmjs.com/package/radix-agent-kit)
[![License](https://img.shields.io/github/license/tolgayayci/radix-agent-kit?style=for-the-badge)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Radix](https://img.shields.io/badge/Radix_DLT-052CC0?style=for-the-badge&logo=radix&logoColor=white)](https://radixdlt.com)

**The most powerful toolkit for building AI agents on Radix DLT**. Connect any AI model to Radix blockchain operations through natural language or direct API calls.

## 🚀 Try It Instantly

[![Run on Replit](https://replit.com/badge/github/tolgayayci/radix-agent-kit)](https://replit.com/@tolgayayci1/radixagentkit)

Get up and running in seconds! Click the button above to try Radix Agent Kit in your browser with zero setup.

## ⚡ Quick Start

### Installation

```bash
npm install radix-agent-kit
```

### Environment Setup

Create a `.env` file:

```bash
# Required for AI features
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Use existing wallet (leave empty to auto-generate)
RADIX_MNEMONIC=your_24_word_mnemonic_phrase_here
```

### Basic AI Agent

```typescript
import { RadixAgent, RadixNetwork } from "radix-agent-kit";

const agent = new RadixAgent({
  networkId: RadixNetwork.Stokenet,  // Start with testnet
  openaiApiKey: process.env.OPENAI_API_KEY
});

// Generate new wallet automatically
const { wallet, mnemonic } = agent.generateNewWallet();
console.log("💰 New Address:", wallet.getAddress());
console.log("🔑 Save this mnemonic:", mnemonic);
console.log("💡 Fund your wallet: https://stokenet-dashboard.radixdlt.com/");

// Natural language blockchain interactions
await agent.run("What's my XRD balance?");
await agent.run("What's my account information?");
```

## 🔧 Agent Creation Options

### Option 1: Auto-Generated Wallet (Recommended for testing)

```typescript
const agent = new RadixAgent({
  networkId: RadixNetwork.Stokenet,
  openaiApiKey: process.env.OPENAI_API_KEY,
  applicationName: "MyApp",          // Optional: For Gateway API
  model: "gpt-4",                    // Optional: Default is gpt-3.5-turbo
  temperature: 0.1,                  // Optional: Default is 0
  useMemory: true,                   // Optional: Enable conversation memory
  verbose: true,                     // Optional: Enable detailed logging
  maxIterations: 10                  // Optional: Max agent thinking steps
});

// Generate wallet on demand
const { wallet, mnemonic } = agent.generateNewWallet();
```

### Option 2: Existing Mnemonic

```typescript
const agent = new RadixAgent({
  networkId: RadixNetwork.Stokenet,
  openaiApiKey: process.env.OPENAI_API_KEY,
  mnemonic: process.env.RADIX_MNEMONIC,  // Your 24-word phrase
  useMemory: true,                       // Remember conversation context
  skipAutoFunding: true                  // Skip automatic testnet funding
});
```

### Option 3: Pre-created Wallet

```typescript
import { RadixMnemonicWallet } from "radix-agent-kit";

const wallet = RadixMnemonicWallet.fromMnemonic(
  "abandon abandon abandon...",  // Your mnemonic
  { networkId: RadixNetwork.Stokenet }
);

const agent = new RadixAgent({
  networkId: RadixNetwork.Stokenet,
  openaiApiKey: process.env.OPENAI_API_KEY,
  wallet: wallet
});
```

### Option 4: Custom Tools & Configuration

```typescript
import { createDefaultRadixTools, RadixTool } from "radix-agent-kit";

// Create custom tool
const customTool = new DynamicStructuredTool({
  name: "check_price",
  description: "Check token price",
  schema: z.object({
    token: z.string().describe("Token symbol")
  }),
  func: async ({ token }) => {
    return `Price of ${token}: $1.23`;
    }
});

const agent = new RadixAgent({
  networkId: RadixNetwork.Stokenet,
  openaiApiKey: process.env.OPENAI_API_KEY,
  mnemonic: process.env.RADIX_MNEMONIC,
  customTools: [customTool],         // Add your tools
  useMemory: true,
  verbose: true
});
```

## 🎯 AI Agent Examples

### Account Operations

```typescript
// Check account details
await agent.run("What's my account information?");
await agent.run("Show me my account address");
await agent.run("What's my XRD balance?");
await agent.run("List all my token balances");
await agent.run("Do I have any NFTs?");
```

### Token Transfers

```typescript
// Send XRD
await agent.run("Send 100 XRD to account_tdx_2_12x...");
await agent.run("Transfer 50.5 XRD to Alice's wallet");

// Send custom tokens
await agent.run("Send 1000 GameCoin to account_tdx_2_12x...");
await agent.run("Transfer all my USDT to Bob");
```

### Token Creation

```typescript
// Create fungible tokens
await agent.run("Create a token called GameCoin with symbol GAME and 1M supply");
await agent.run("Create a stablecoin called MyUSD with 18 decimals");
await agent.run("Make a meme token called DogeCoin2 with 1B total supply");

// Create NFT collections
await agent.run("Create an NFT collection called CryptoPunks");
await agent.run("Create NFTs for my art collection with description 'Digital Art Pieces'");
```

### Token Minting

```typescript
// Mint more tokens (if you own the resource)
await agent.run("Mint 10000 more GameCoin tokens");
await agent.run("Create 5 new NFTs in my art collection");
await agent.run("Mint 1 NFT with data: name=Punk1, description=Cool punk, image=https://...");
```

### Staking Operations

```typescript
// Validator staking
await agent.run("Stake 100 XRD with the best validator");
await agent.run("Show me all available validators");
await agent.run("Unstake 50 XRD from my current stake");
await agent.run("Claim my staking rewards");
await agent.run("What are my current staking positions?");
```

### DeFi Operations

```typescript
// Liquidity pools
await agent.run("Add 1000 XRD and 500 USDT to a liquidity pool");
await agent.run("Create a new liquidity pool with 100 XRD and 200 GameCoin");
await agent.run("Show me available liquidity pools");

// Token swapping
await agent.run("Swap 50 XRD for USDT");
await agent.run("Exchange 100 GameCoin for XRD");
await agent.run("Get the best rate for swapping 1000 XRD to USDT");
```

### Smart Contract Interaction

```typescript
// Component method calls
await agent.run("Call the get_price method on component_tdx_2_1c...");
await agent.run("Get the state of component_tdx_2_1c...");
await agent.run("Call swap_tokens on the DEX with 100 XRD");
await agent.run("Interact with component_tdx_2_1c... to check pool liquidity");
```

### Utility Operations

```typescript
// Network information
await agent.run("What's the current epoch?");
await agent.run("Fund my Stokenet wallet from the faucet");
await agent.run("Show me the current network status");
```

## 🛠️ All Available Tools (16 Total)

The AI agent comes with **16 specialized tools** for comprehensive blockchain operations:

### 🏦 Account & Wallet Management (3 tools)

| Tool | Description | Example Usage |
|------|-------------|---------------|
| **get_account_info** | Get account details and metadata | `"What's my account information?"` |
| **get_balances** | Check all token balances | `"Show me all my balances"` |
| **fund_stokenet_wallet** | Auto-fund testnet wallet | `"Fund my wallet from faucet"` |

### 💸 Token Operations (5 tools)

| Tool | Description | Example Usage |
|------|-------------|---------------|
| **transfer_tokens** | Send XRD and custom tokens | `"Send 100 XRD to Alice"` |
| **create_fungible_resource** | Create new tokens | `"Create a token called GameCoin"` |
| **create_non_fungible_resource** | Create NFT collections | `"Create an NFT collection"` |
| **mint_fungible_resource** | Mint more tokens | `"Mint 1000 more GameCoin"` |
| **mint_non_fungible_resource** | Mint new NFTs | `"Create 5 new NFTs"` |

### 🥩 Validator Operations (3 tools)

| Tool | Description | Example Usage |
|------|-------------|---------------|
| **stake_xrd** | Stake with validators | `"Stake 100 XRD with best validator"` |
| **unstake_xrd** | Unstake from validators | `"Unstake 50 XRD"` |
| **claim_xrd** | Claim staking rewards | `"Claim my staking rewards"` |

### 🌊 DeFi Operations (2 tools)

| Tool | Description | Example Usage |
|------|-------------|---------------|
| **add_liquidity** | Add liquidity to pools | `"Add 1000 XRD to XRD/USDT pool"` |
| **swap_tokens** | Swap between tokens | `"Swap 50 XRD for USDT"` |

### 🔧 Component Interaction (2 tools)

| Tool | Description | Example Usage |
|------|-------------|---------------|
| **call_component_method** | Call smart contract methods | `"Call get_price on component_tdx..."` |
| **get_component_state** | Get component state | `"Get state of component_tdx..."` |

### ⚡ Utility Tools (1 tool)

| Tool | Description | Example Usage |
|------|-------------|---------------|
| **get_epoch** | Get current network epoch | `"What's the current epoch?"` |

## 🌐 Networks

### Stokenet (Testnet) - **Start Here**
```typescript
const agent = new RadixAgent({
  networkId: RadixNetwork.Stokenet,  // networkId: 2
  // ... other config
});
```

- **Free testnet XRD**: [Stokenet Dashboard](https://stokenet-dashboard.radixdlt.com/)
- **Community faucets**: [Radix Discord](https://discord.gg/radixdlt)
- **Perfect for development and testing**

### Mainnet (Production)
```typescript
const agent = new RadixAgent({
  networkId: RadixNetwork.Mainnet,  // networkId: 1
  // ... other config
});
```

- **Real XRD with actual value**
- **Use only after thorough testing on Stokenet**
- **Start with small amounts**

## 💻 Direct API Usage

Skip AI and use blockchain functions directly:

```typescript
import { 
  RadixGatewayClient, 
  RadixMnemonicWallet,
  RadixTransactionBuilder,
  Token,
  DeFi,
  Component,
  RadixNetwork
} from "radix-agent-kit";

// Setup core components
const gateway = new RadixGatewayClient({ 
  networkId: RadixNetwork.Stokenet 
});

const wallet = RadixMnemonicWallet.fromMnemonic(
  process.env.RADIX_MNEMONIC!,
  { networkId: RadixNetwork.Stokenet }
);

const txBuilder = new RadixTransactionBuilder({ 
  networkId: RadixNetwork.Stokenet 
});

// Check balance directly
const balances = await gateway.getAccountBalances(wallet.getAddress());
console.log("Balances:", balances);

// Create token directly
const token = new Token(txBuilder, gateway, RadixNetwork.Stokenet);
const txHash = await token.createFungibleResource({
  name: "MyToken",
  symbol: "MTK",
  initialSupply: "1000000"
}, wallet, await gateway.getCurrentEpoch());

console.log("Token created:", txHash);

// DeFi operations
const defi = new DeFi(txBuilder, gateway, RadixNetwork.Stokenet);
const stakeTxHash = await defi.stakeXRD({
  accountAddress: wallet.getAddress(),
  validatorAddress: "validator_tdx_2_1sd5368...",
  amount: "100"
}, wallet, await gateway.getCurrentEpoch());

console.log("Staked XRD:", stakeTxHash);
```

## ⚠️ Important Notes

### 💰 Wallet Funding

```typescript
// ❌ New wallets start with ZERO balance!
const { wallet, mnemonic } = agent.generateNewWallet();
console.log("Address:", wallet.getAddress());
// This wallet has 0 XRD and can't perform transactions

// ✅ Always fund new wallets before use
console.log("Fund this address:", wallet.getAddress());
// Get testnet XRD from: https://stokenet-dashboard.radixdlt.com/
// Or use: await agent.run("Fund my wallet from faucet");
```

### 🔐 Private Key Security

```typescript
// ❌ Never hardcode mnemonics
const agent = new RadixAgent({
  mnemonic: "abandon abandon abandon..." // DON'T DO THIS!
});

// ✅ Use environment variables
const agent = new RadixAgent({
  mnemonic: process.env.RADIX_MNEMONIC,
  openaiApiKey: process.env.OPENAI_API_KEY
});
```

### 🧪 Safe Development

```typescript
// ✅ Always start with testnet
const networkId = process.env.NODE_ENV === 'production' 
  ? RadixNetwork.Mainnet 
  : RadixNetwork.Stokenet;

const agent = new RadixAgent({
  networkId: networkId,
  openaiApiKey: process.env.OPENAI_API_KEY,
  mnemonic: process.env.RADIX_MNEMONIC
});
```

## 🛠️ Advanced Usage

### Error Handling

```typescript
try {
  const result = await agent.run("Send 1000000 XRD to invalid_address");
} catch (error) {
  if (error.message.includes("Insufficient funds")) {
    console.log("💸 Not enough XRD for this transaction");
  } else if (error.message.includes("Invalid address")) {
    console.log("📍 Please provide a valid Radix address");
  } else {
    console.log("❌ Transaction failed:", error.message);
  }
}
```

### Batch Operations

```typescript
// Execute multiple operations in sequence
const operations = [
  "What's my current XRD balance?",
  "Create a token called BatchToken with 1M supply",
  "Create an NFT collection called BatchNFTs", 
  "Stake 100 XRD with the highest APY validator"
];

const results = [];
for (const operation of operations) {
  try {
    const result = await agent.run(operation);
    results.push({ operation, success: true, result });
    console.log(`✅ ${operation}: ${result}`);
  } catch (error) {
    results.push({ operation, success: false, error: error.message });
    console.log(`❌ ${operation}: ${error.message}`);
  }
}

console.log("Batch results:", results);
```

### Custom Tools

```typescript
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

// Create a price checking tool
const priceChecker = new DynamicStructuredTool({
  name: "check_token_price",
  description: "Check current price of any token on Radix",
  schema: z.object({
    token: z.string().describe("Token symbol or address"),
  }),
  func: async ({ token }) => {
    // Your price fetching logic here
    const price = await fetchTokenPrice(token);
    return `Current price of ${token}: $${price}`;
  }
});

// Add to agent
const agent = new RadixAgent({
  networkId: RadixNetwork.Stokenet,
  openaiApiKey: process.env.OPENAI_API_KEY,
  customTools: [priceChecker]
});

// Use in conversation
const response = await agent.run("Check the price of GameCoin");
```

## 📖 Complete Documentation

**📚 [Full Documentation](https://docs.radixagent.com)** - Complete guides and API reference

### 📘 User Guides
- **[Introduction](https://docs.radixagent.com/introduction)** - Overview and core concepts
- **[Quick Start](https://docs.radixagent.com/quickstart)** - Get running in 5 minutes  
- **[Features](https://docs.radixagent.com/features)** - All 16 tools and capabilities
- **[AI Tools](https://docs.radixagent.com/tools)** - Detailed tool documentation
- **[Security](https://docs.radixagent.com/security)** - Wallet management and best practices

### 📗 API Reference
- **[Overview](https://docs.radixagent.com/api-reference)** - Complete API documentation
- **[RadixAgent](https://docs.radixagent.com/api-reference/agent)** - Main AI agent class
- **[RadixGatewayClient](https://docs.radixagent.com/api-reference/gateway)** - Gateway API client
- **[RadixMnemonicWallet](https://docs.radixagent.com/api-reference/mnemonic-wallet)** - Wallet management
- **[Token Operations](https://docs.radixagent.com/api-reference/token)** - Token creation and transfers
- **[DeFi Operations](https://docs.radixagent.com/api-reference/defi)** - Staking and liquidity
- **[Security Classes](https://docs.radixagent.com/api-reference/security)** - Transaction validation
- **[FaucetHelper](https://docs.radixagent.com/api-reference/faucet)** - Testnet funding utilities

## 🔗 Key Dependencies

Built on the robust Radix and AI ecosystem:

- **[@radixdlt/babylon-gateway-api-sdk](https://www.npmjs.com/package/@radixdlt/babylon-gateway-api-sdk)** - Radix Gateway API
- **[@radixdlt/radix-engine-toolkit](https://www.npmjs.com/package/@radixdlt/radix-engine-toolkit)** - Transaction building
- **[langchain](https://www.npmjs.com/package/langchain)** - AI agent framework
- **[@langchain/openai](https://www.npmjs.com/package/@langchain/openai)** - OpenAI integration
- **[bip39](https://www.npmjs.com/package/bip39)** - Mnemonic generation

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and add tests
4. **Run tests**: `npm test`
5. **Submit a pull request**

### Development Setup

```bash
git clone https://github.com/tolgayayci/radix-agent-kit
cd radix-agent-kit
pnpm install
cd packages/radix-agent-kit
pnpm build
pnpm test
```

## 📋 Requirements

- **Node.js 18+**
- **OpenAI API Key** (for AI features)
- **Radix account with XRD** (for transaction fees)

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support & Community

- **📖 Documentation**: [docs.radixagent.com](https://docs.radixagent.com)
- **🐛 Bug Reports**: [GitHub Issues](https://github.com/tolgayayci/radix-agent-kit/issues)
- **💬 Community**: [Radix Discord](https://discord.gg/radixdlt)
- **🐦 Updates**: Follow [@tolgayayci](https://twitter.com/tolgayayci)

## 🔐 Security

This toolkit handles private keys and transaction signing. Always:

- **Use environment variables** for sensitive data
- **Start with testnet** for development
- **Test thoroughly** before mainnet deployment
- **Keep dependencies updated**
- **Review transaction details** before signing

---

**Built with ❤️ for the Radix ecosystem** | **Created by [Tolga Yaycı](https://github.com/tolgayayci)**
