# 🌟 Radix Agent Kit - Complete Token Operations Demo

A comprehensive demonstration of all 5 core token operations on the Radix Network using AI-powered blockchain interactions.

## ✅ Token Operations Showcased

This demo demonstrates **production-ready** token management:

### 🪙 **1. Create Fungible Resource**
```javascript
createFungibleResource(options)
```
- Create custom tokens with supply, symbol, and metadata
- Real tokens that appear on Radix dashboard
- Full control over token economics

### 🎨 **2. Create NFT Collection** 
```javascript
createNonFungibleResource(options)
```
- Create NFT collections with proper schema
- Support for metadata fields (name, description, image)
- Production-ready NFT infrastructure

### 🔨 **3. Mint Fungible Tokens**
```javascript
mintFungible(resourceAddress, amount)
```
- Mint additional tokens to existing resources
- Requires minter privileges
- Automatic balance updates

### 🎭 **4. Mint NFTs**
```javascript
mintNonFungible(resourceAddress, data)
```
- Mint individual NFTs with custom metadata
- Schema-validated data structure
- Real NFTs visible on blockchain

### 💸 **5. Transfer Resources**
```javascript
transferResources(options)
```
- Transfer tokens between wallets
- Support for both fungible tokens and NFTs
- Cross-account token operations

## 🔧 Component Interaction Demo

New in this release - **smart contract component interaction**:

### 📋 **Component State Retrieval**
```javascript
getComponentState(componentAddress)
```
- Get current state of any Radix component
- Retrieve metadata, role assignments, and internal state
- Real-time component information

### 📞 **Component Method Calling**
```javascript
callComponentMethod(address, method, args)
```
- Call methods on live Radix components
- Execute smart contract functions
- Interact with DeFi protocols, faucets, and custom components

## 🚀 Quick Start

1. **Set Environment Variables**
   ```bash
   cp env-example .env
   # Add your OPENAI_API_KEY
   ```

2. **Run the Main Demo**
   ```bash
   npm start
   ```

3. **Run Component Interaction Demo**
   ```bash
   node demos/component-interaction.js
   ```

4. **Run Account Operations Demo**
   ```bash
   node demos/account-operations.js
   ```

## 💬 Example AI Commands

Ask your agent natural language questions:

### Token Operations:
```
"Create a gaming token called GOLD with 1M supply"
"Make an NFT collection for my artwork"
"Mint 100 more GOLD tokens"
"Create an NFT called Masterpiece #1"
"Send 50 GOLD tokens to account_tdx_2_..."
"What tokens do I have and their balances?"
```

### Component Interactions:
```
"Get the state of component component_tdx_2_1cpt..."
"What information can you tell me about the Stokenet faucet component?"
"Call the get_amount method on the faucet component"
"Show me the metadata and details of this component"
```

## 🔗 Real Network Integration

- **Network**: Radix Stokenet (Testnet)
- **Real Transactions**: All operations create actual blockchain transactions
- **Dashboard**: View your tokens at https://stokenet-dashboard.radixdlt.com/
- **Faucet**: Get testnet XRD at https://stokenet-faucet.radixdlt.com/

## 🛠️ What Makes This Special

Unlike typical blockchain demos that use placeholders:

✅ **Real Resource Addresses** - Extracted from actual transactions  
✅ **Proper Schema Validation** - NFTs with correct data structure  
✅ **Production Patterns** - Code ready for mainnet deployment  
✅ **AI Integration** - Natural language blockchain interactions  
✅ **Complete Toolkit** - All 5 essential token operations  
✅ **Component Interaction** - Real smart contract component integration  
✅ **Live Network Data** - Interact with actual Stokenet components  

## 📚 Documentation

- [Full Documentation](https://docs.radix-agent-kit.com)
- [GitHub Repository](https://github.com/tolgayayci/radix-agent-kit)
- [Radix Network](https://radixdlt.com)

## ⚠️ Important Notes

- This uses **Stokenet testnet** - no real value
- All operations are **production-ready** code patterns
- Ready to deploy on **mainnet** with minimal changes

## Features

This Replit example demonstrates:

### 🔐 Automatic Wallet Creation
- **No mnemonic required**: When you create a RadixAgent without providing a mnemonic, it automatically creates a new wallet on Stokenet
- **Automatic funding**: New wallets are automatically funded with testnet XRD  
- **Security**: If no wallet credentials are provided, the agent forces Stokenet network (never mainnet)
- **Immediate display**: Wallet details (address, mnemonic, dashboard link) are shown immediately

### 🤖 AI Agent Capabilities
- Natural language blockchain interactions
- Account information retrieval
- Balance checking
- Token transfers
- Resource creation (tokens, NFTs)
- Staking operations  
- DeFi operations (swaps, liquidity)
- **Component interaction** (NEW!)
- **Smart contract state retrieval** (NEW!)
- **Component method calling** (NEW!)

### 📋 Demo Scripts
- `demos/account-operations.js` - Tests automatic wallet creation and basic operations
- `demos/component-interaction.js` - Tests component state retrieval and method calling

---

*Built with ❤️ using Radix Agent Kit - Making blockchain accessible through AI* 