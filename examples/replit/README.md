# Radix Agent Kit - Replit Demo

A comprehensive demonstration of [Radix Agent Kit](https://www.npmjs.com/package/radix-agent-kit) running on Replit. This template showcases AI-powered blockchain interactions with the Radix DLT network.

## 🚀 Quick Start

### 1. Setup Environment

Click **"Secrets"** in the left sidebar and add:

```
OPENAI_API_KEY=your-openai-api-key-here
```

Optionally add your existing wallet:
```
RADIX_MNEMONIC=your twelve word mnemonic phrase
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run the Demo

```bash
npm start
```

## 🎯 What's Included

### Main Demo (`npm start`)
Comprehensive showcase of all Radix Agent Kit features:
- AI agent initialization
- Account information retrieval
- Token creation and management
- Available tools overview
- Interactive examples

### Specialized Demos

| Command | Description |
|---------|-------------|
| `npm run demo:basic` | Simple AI blockchain interactions |
| `npm run demo:tokens` | Token creation and management |
| `npm run demo:defi` | DeFi operations (pools, swapping) |
| `npm run demo:staking` | XRD staking with validators |
| `npm run demo:direct-api` | Direct API usage without AI |

## 🤖 AI Agent Examples

Your agent understands natural language:

```javascript
// Check balances
await agent.run("What's my XRD balance?");

// Create tokens
await agent.run("Create a token called GameCoin with 1M supply");

// Transfer tokens
await agent.run("Send 100 XRD to account_tdx_2_1c8...");

// DeFi operations
await agent.run("Create a pool with 1000 XRD and 500 MyToken");
await agent.run("Swap 50 XRD for MyToken");

// Staking
await agent.run("Stake 100 XRD with the best validator");
```

## 🛠️ Direct API Examples

Skip the AI for programmatic control:

```javascript
import { 
  RadixGatewayClient, 
  RadixMnemonicWallet, 
  Token 
} from 'radix-agent-kit';

// Setup
const gateway = new RadixGatewayClient({ 
  networkId: RadixNetwork.Stokenet 
});
const wallet = RadixMnemonicWallet.fromMnemonic(mnemonic, { 
  networkId: RadixNetwork.Stokenet 
});

// Check balance
const balances = await gateway.getAccountBalances(wallet.getAddress());

// Create token
const token = new Token(transactionBuilder, gateway, RadixNetwork.Stokenet);
await token.createFungibleResource({ ... }, wallet, epoch);
```

## 🔧 Configuration

The demos support these environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | ✅ | Your OpenAI API key for AI functionality |
| `RADIX_MNEMONIC` | ❌ | Your wallet mnemonic (generates new if not provided) |
| `RADIX_NETWORK` | ❌ | Network to use (defaults to Stokenet) |
| `APP_NAME` | ❌ | Application name for Gateway client |

## 🌐 Networks

| Network | Purpose | Use For |
|---------|---------|---------|
| **Stokenet** | Testnet | Development, testing, learning |
| **Mainnet** | Production | Real applications with real value |

⚠️ **Always use Stokenet for demos and testing!**

## 💡 Getting Test XRD

You need XRD for transaction fees on Stokenet:

1. **Get your wallet address** from any demo
2. **Visit Radix Dashboard**: [Stokenet Dashboard](https://stokenet-dashboard.radixdlt.com/)
3. **Or ask in Discord**: [Radix Discord](https://discord.gg/radixdlt) for community faucets
4. **Request test XRD** for your address
5. **Wait a few minutes** for confirmation

<Warning>
**New wallets start empty!** Generated wallets have zero XRD balance. You must fund them before performing transactions.
</Warning>

## 🛠️ Available AI Tools

Your agent has access to 8 specialized tools:

- **GetAccountInfoTool** - Account details and balances
- **TransferTokensTool** - Send XRD and custom tokens  
- **CreateFungibleResourceTool** - Create new tokens
- **CreateNonFungibleResourceTool** - Create NFT collections
- **AddLiquidityTool** - Add liquidity to pools
- **SwapTokensTool** - Swap between tokens
- **StakeXRDTool** - Stake XRD with validators
- **CallComponentMethodTool** - Interact with smart contracts

## 📚 Learn More

- **Documentation**: [docs.radix-agent-kit.com](https://docs.radix-agent-kit.com)
- **NPM Package**: [radix-agent-kit](https://www.npmjs.com/package/radix-agent-kit)
- **GitHub**: [tolgayayci/radix-agent-kit](https://github.com/tolgayayci/radix-agent-kit)
- **Radix DLT**: [radixdlt.com](https://radixdlt.com)

## 🔒 Security Notes

- This template uses **Stokenet (testnet)** - no real value
- Private keys are managed securely by the SDK
- Never share your mainnet mnemonic in Replit
- Always verify addresses before real transactions

## 🚀 Next Steps

1. **Try the demos** - Run different npm scripts to explore features
2. **Modify the code** - Experiment with different AI prompts
3. **Read the docs** - Learn about advanced features
4. **Build your app** - Use this as a starting point for your project

---

**Happy building with Radix Agent Kit! 🌟** 