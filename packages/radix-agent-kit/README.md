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

### Basic AI Agent

```typescript
import { RadixAgent, RadixNetwork } from "radix-agent-kit";

const agent = new RadixAgent({
  networkId: RadixNetwork.Stokenet,  // Start with testnet
  openaiApiKey: process.env.OPENAI_API_KEY
});

// Generate new wallet (starts with 0 XRD - fund before use)
const { wallet, mnemonic } = agent.generateNewWallet();
console.log("Address:", wallet.getAddress());
console.log("Save this mnemonic:", mnemonic);

// Natural language blockchain interactions
const response = await agent.run("What's my XRD balance?");
console.log(response);
```

### Direct API Usage

Skip AI and use blockchain functions directly:

```typescript
import { 
  RadixGatewayClient, 
  RadixMnemonicWallet,
  RadixTransactionBuilder,
  Token,
  DeFi,
  RadixNetwork
} from "radix-agent-kit";

// Setup core components
const gateway = new RadixGatewayClient({ networkId: RadixNetwork.Stokenet });
const wallet = RadixMnemonicWallet.fromMnemonic("your twelve word mnemonic", {
  networkId: RadixNetwork.Stokenet
});
const txBuilder = new RadixTransactionBuilder({ networkId: RadixNetwork.Stokenet });

// Check balance
const balances = await gateway.getAccountBalances(wallet.getAddress());
console.log("Balances:", balances);

// Create token directly
const token = new Token(txBuilder, gateway, RadixNetwork.Stokenet);
const txHash = await token.createFungibleToken({
  name: "MyToken",
  symbol: "MTK",
  initialSupply: "1000000"
}, wallet);
```

## 🎯 Core Features

### 🤖 AI-Powered Agent
- **Natural Language Interface** - Talk to your blockchain like ChatGPT
- **8 Specialized Tools** - Built-in LangChain tools for all operations
- **Memory Support** - Context-aware conversations
- **Error Handling** - Smart error recovery and suggestions

### 💰 Account Operations
```typescript
// Check balances and account info
await agent.run("What's my account information?");
await agent.run("Show me all my token balances");
await agent.run("What's my account address?");
```

### 💸 Token Operations
```typescript
// Send XRD and tokens
await agent.run("Send 100 XRD to account_tdx_2_12x...");
await agent.run("Transfer 50 MyToken to Alice");

// Create new tokens
await agent.run("Create a token called GameCoin with 1M supply");
await agent.run("Create an NFT collection called CryptoPunks");
```

### 🏊‍♂️ DeFi Operations
```typescript
// Liquidity pools and swapping
await agent.run("Create a liquidity pool with 1000 XRD and 500 MyToken");
await agent.run("Swap 50 XRD for MyToken");
await agent.run("Add 100 XRD to the XRD/MyToken pool");
```

### 🥩 Staking Operations
```typescript
// Stake with validators
await agent.run("Stake 100 XRD with the best validator");
await agent.run("Show me all validators");
await agent.run("Unstake 50 XRD from my current validator");
```

### 🔧 Smart Contract Interaction
```typescript
// Call any component method
await agent.run("Call the get_price method on component_tdx_2_1c...");
await agent.run("Interact with the DEX component to get pool info");
```

## 📚 Comprehensive Examples

### Portfolio Manager Agent

```typescript
import { RadixAgent, RadixNetwork } from "radix-agent-kit";

class PortfolioAgent {
  constructor(private agent: RadixAgent) {}
  
  async getDashboard() {
    const balance = await this.agent.run("What's my XRD balance?");
    const tokens = await this.agent.run("What tokens do I own?");
    const stakes = await this.agent.run("Show my staking positions");
    
    return { balance, tokens, stakes };
  }
  
  async rebalancePortfolio(targets: Record<string, number>) {
    for (const [token, percentage] of Object.entries(targets)) {
      await this.agent.run(`Rebalance to ${percentage}% ${token}`);
    }
  }
}

const agent = new RadixAgent({
  networkId: RadixNetwork.Stokenet,
  openaiApiKey: process.env.OPENAI_API_KEY,
  mnemonic: process.env.RADIX_MNEMONIC
});

const portfolio = new PortfolioAgent(agent);
const dashboard = await portfolio.getDashboard();
```

### Token Creator Bot

```typescript
class TokenCreator {
  constructor(private agent: RadixAgent) {}
  
  async createGameToken(gameData: any) {
    const result = await this.agent.run(
      `Create a gaming token called ${gameData.name} with symbol ${gameData.symbol} 
       and ${gameData.supply} initial supply for game rewards`
    );
    return result;
  }
  
  async createNFTCollection(collectionData: any) {
    const result = await this.agent.run(
      `Create an NFT collection called ${collectionData.name} 
       with description "${collectionData.description}"`
    );
    return result;
  }
}

const creator = new TokenCreator(agent);
await creator.createGameToken({
  name: "BattleCoins",
  symbol: "BATTLE",
  supply: "10000000"
});
```

### DeFi Yield Farmer

```typescript
class YieldFarmer {
  constructor(private agent: RadixAgent) {}
  
  async findBestPools() {
    return await this.agent.run("Show me all available liquidity pools with their APY");
  }
  
  async enterPosition(pool: string, amount: string) {
    return await this.agent.run(`Add ${amount} XRD to the ${pool} pool`);
  }
  
  async harvest() {
    return await this.agent.run("Claim all my DeFi rewards");
  }
  
  async exitPosition(pool: string, percentage: number) {
    return await this.agent.run(`Remove ${percentage}% of my liquidity from ${pool}`);
  }
}

const farmer = new YieldFarmer(agent);
const bestPools = await farmer.findBestPools();
await farmer.enterPosition("XRD/USDT", "1000");
```

### Trading Bot

```typescript
class TradingBot {
  constructor(private agent: RadixAgent) {}
  
  async executeStrategy(signals: any[]) {
    for (const signal of signals) {
      if (signal.action === 'buy') {
        await this.agent.run(`Swap ${signal.amount} XRD for ${signal.token}`);
      } else if (signal.action === 'sell') {
        await this.agent.run(`Swap ${signal.amount} ${signal.token} for XRD`);
      }
    }
  }
  
  async setStopLoss(token: string, price: number) {
    // Implementation would involve monitoring and conditional execution
    await this.agent.run(`Set alert for ${token} if price drops below ${price}`);
  }
}
```

### Multi-Agent System

```typescript
class RadixMultiAgent {
  private agents: Map<string, RadixAgent> = new Map();
  
  constructor(private config: any) {
    // Create specialized agents
    this.agents.set('trader', new RadixAgent({...config, applicationName: 'Trader'}));
    this.agents.set('farmer', new RadixAgent({...config, applicationName: 'Farmer'}));
    this.agents.set('creator', new RadixAgent({...config, applicationName: 'Creator'}));
  }
  
  async executeTask(type: string, instruction: string) {
    const agent = this.agents.get(type);
    if (!agent) throw new Error(`Unknown agent type: ${type}`);
    
    return await agent.run(instruction);
  }
  
  async coordinatedAction(tasks: Array<{type: string, instruction: string}>) {
    const results = await Promise.all(
      tasks.map(task => this.executeTask(task.type, task.instruction))
    );
    return results;
  }
}

const multiAgent = new RadixMultiAgent(config);
await multiAgent.coordinatedAction([
  { type: 'creator', instruction: 'Create a new gaming token' },
  { type: 'farmer', instruction: 'Add liquidity to the new token pool' },
  { type: 'trader', instruction: 'Set up automated trading for the token' }
]);
```

## 🔧 Available Tools

The AI agent comes with 8 specialized tools for blockchain operations:

| Tool | Description | Example Usage |
|------|-------------|---------------|
| **GetAccountInfoTool** | Account details and metadata | `"What's my account information?"` |
| **GetBalancesTool** | Token balances and holdings | `"Show me all my balances"` |
| **TransferTokensTool** | Send XRD and custom tokens | `"Send 100 XRD to Alice"` |
| **CreateFungibleResourceTool** | Create new tokens | `"Create a token called GameCoin"` |
| **CreateNonFungibleResourceTool** | Create NFT collections | `"Create an NFT collection"` |
| **StakeXRDTool** | Stake with validators | `"Stake 100 XRD with the best validator"` |
| **AddLiquidityTool** | Add liquidity to pools | `"Add liquidity to XRD/USDT pool"` |
| **SwapTokensTool** | Token swapping | `"Swap 50 XRD for MyToken"` |
| **CallComponentMethodTool** | Smart contract interaction | `"Call get_price on component_tdx..."` |

## 🌐 Networks

### Stokenet (Testnet) - **Start Here**
```typescript
const agent = new RadixAgent({
  networkId: RadixNetwork.Stokenet,
  // ... other config
});
```

- **Free testnet XRD**: [Stokenet Dashboard](https://stokenet-dashboard.radixdlt.com/)
- **Community faucets**: [Radix Discord](https://discord.gg/radixdlt)
- **Perfect for development and testing**

### Mainnet (Production)
```typescript
const agent = new RadixAgent({
  networkId: RadixNetwork.Mainnet,
  // ... other config
});
```

- **Real XRD with actual value**
- **Use only after thorough testing on Stokenet**
- **Start with small amounts**

## ⚠️ Important Security Notes

### Wallet Funding
```typescript
// ❌ New wallets start with ZERO balance!
const { wallet, mnemonic } = agent.generateNewWallet();
// This wallet has 0 XRD and can't perform transactions

// ✅ Always fund new wallets before use
console.log("Fund this address:", wallet.getAddress());
// Get testnet XRD from Dashboard or Discord faucets
```

### Private Key Security
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

### Safe Development Practices
```typescript
// ✅ Always start with testnet
if (process.env.NODE_ENV === 'production') {
  // Extra validation for mainnet
  if (!process.env.CONFIRMED_MAINNET) {
    throw new Error("Set CONFIRMED_MAINNET=true to use mainnet");
  }
}

const networkId = process.env.NODE_ENV === 'production' 
  ? RadixNetwork.Mainnet 
  : RadixNetwork.Stokenet;
```

## 🛠️ Advanced Usage

### Custom Tool Creation

```typescript
import { RadixTool } from "radix-agent-kit";

class PriceCheckerTool extends RadixTool {
  name = "check_token_price";
  description = "Check current price of any token";
  
  async _call(input: string): Promise<string> {
    // Your custom price checking logic
    const price = await this.fetchTokenPrice(input);
    return `Current price of ${input}: $${price}`;
  }
  
  private async fetchTokenPrice(token: string): Promise<number> {
    // Implementation
    return 1.23;
  }
}

// Add to agent
const priceChecker = new PriceCheckerTool(gateway, builder, wallet, networkId);
agent.addTool(priceChecker);

// Use in conversation
const response = await agent.run("Check price of MyToken");
```

### Error Handling

```typescript
try {
  const result = await agent.run("Send 1000000 XRD to invalid_address");
} catch (error) {
  if (error.message.includes("Insufficient funds")) {
    console.log("Not enough XRD for this transaction");
  } else if (error.message.includes("Invalid address")) {
    console.log("Please provide a valid Radix address");
  } else {
    console.log("Transaction failed:", error.message);
  }
}
```

### Batch Operations

```typescript
// Execute multiple operations in sequence
const operations = [
  "Create a token called BatchToken with 1M supply",
  "Create an NFT collection called BatchNFTs", 
  "Stake 100 XRD with the highest APY validator"
];

for (const operation of operations) {
  try {
    const result = await agent.run(operation);
    console.log(`✅ ${operation}: ${result}`);
  } catch (error) {
    console.log(`❌ ${operation}: ${error.message}`);
  }
}
```

## 📖 Complete Documentation

**📚 [docs.radixagent.com](https://docs.radixagent.com)** - Complete guides and API reference

- **[Quickstart Guide](https://docs.radixagent.com/quickstart)** - Get running in 5 minutes
- **[Feature Overview](https://docs.radixagent.com/features)** - All capabilities explained
- **[API Reference](https://docs.radixagent.com/api/overview)** - Complete API documentation
- **[Security Guide](https://docs.radixagent.com/security)** - Best practices and security
- **[Examples Gallery](https://docs.radixagent.com/examples)** - Real-world implementations

## 🚀 Example Projects

### Built with Radix Agent Kit

- **Discord Bot** - AI agent for Discord servers ([example](./examples/discord-bot))
- **Telegram Bot** - Blockchain operations via Telegram ([example](./examples/telegram-bot))
- **Portfolio Tracker** - NextJS app with AI agent ([example](./examples/nextjs-app))
- **Trading Bot** - Automated DeFi trading strategies
- **NFT Minter** - AI-powered NFT collection creator

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
