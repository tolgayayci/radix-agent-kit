#!/usr/bin/env node

import 'dotenv/config';
import { RadixAgent, RadixNetwork } from 'radix-agent-kit';

// 🎨 Console styling
const styles = {
  title: '\x1b[1m\x1b[35m',    // Bold Magenta
  success: '\x1b[1m\x1b[32m',  // Bold Green
  info: '\x1b[1m\x1b[36m',     // Bold Cyan
  warning: '\x1b[1m\x1b[33m',  // Bold Yellow
  error: '\x1b[1m\x1b[31m',    // Bold Red
  reset: '\x1b[0m',            // Reset
  dim: '\x1b[2m'               // Dim
};

function log(style, message) {
  console.log(`${style}${message}${styles.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(50));
  log(styles.title, `🤖 ${title}`);
  console.log('='.repeat(50));
}

// Main demo function
async function main() {
  log(styles.title, '🌟 Radix Agent Kit - Comprehensive Replit Demo');
  log(styles.info, 'This demo showcases AI-powered blockchain interactions');
  console.log();

  // Check environment
  if (!process.env.OPENAI_API_KEY) {
    log(styles.error, '❌ Missing OPENAI_API_KEY environment variable');
    log(styles.warning, '🔧 Please set your OpenAI API key in the .env file');
    process.exit(1);
  }

  try {
    // Initialize agent
    log(styles.info, '🚀 Initializing Radix Agent...');
    
    const agent = new RadixAgent({
      networkId: RadixNetwork.Stokenet,
      openaiApiKey: process.env.OPENAI_API_KEY,
      mnemonic: process.env.RADIX_MNEMONIC, // Optional - will generate new if not provided
      applicationName: process.env.APP_NAME || 'RadixAgentReplit'
    });

    // If no mnemonic provided, generate new wallet
    let walletInfo = null;
    if (!process.env.RADIX_MNEMONIC) {
      log(styles.warning, '🔑 No mnemonic provided, generating new wallet...');
      walletInfo = agent.generateNewWallet();
      log(styles.success, `✅ New wallet created: ${walletInfo.wallet.getAddress()}`);
      log(styles.warning, `💾 Save this mnemonic: ${walletInfo.mnemonic}`);
      console.log();
    }

    const wallet = agent.getWallet();
    const walletAddress = wallet ? wallet.getAddress() : 'No wallet available';
    log(styles.success, `✅ Agent initialized successfully!`);
    log(styles.info, `📍 Wallet Address: ${walletAddress}`);
    log(styles.info, `🌐 Network: Stokenet (Testnet)`);

    // Demo 1: Account Information
    logSection('Account Information');
    try {
      const accountInfo = await agent.run("What's my account information including balance?");
      log(styles.success, `🏦 Account Info: ${accountInfo}`);
    } catch (error) {
      log(styles.error, `❌ Account info error: ${error.message}`);
    }

    // Demo 2: Check XRD Balance
    logSection('XRD Balance Check');
    try {
      const balance = await agent.run("What's my XRD balance?");
      log(styles.success, `💰 Balance: ${balance}`);
    } catch (error) {
      log(styles.error, `❌ Balance check error: ${error.message}`);
    }

    // Demo 3: Token Creation
    logSection('Token Creation Demo');
    try {
      const tokenResult = await agent.run("Create a fungible token called DemoToken with symbol DEMO and 1000000 initial supply");
      log(styles.success, `🪙 Token Creation: ${tokenResult}`);
    } catch (error) {
      log(styles.error, `❌ Token creation error: ${error.message}`);
      if (error.message.includes('insufficient')) {
        log(styles.warning, '💡 Tip: Get testnet XRD from https://stokenet-faucet.radixdlt.com/');
      }
    }

    // Demo 4: NFT Creation
    logSection('NFT Collection Demo');
    try {
      const nftResult = await agent.run("Create an NFT collection called DemoNFTs");
      log(styles.success, `🎨 NFT Collection: ${nftResult}`);
    } catch (error) {
      log(styles.error, `❌ NFT creation error: ${error.message}`);
    }

    // Demo 5: Show all available tools
    logSection('Available AI Tools');
    log(styles.info, '🛠️  Your agent has access to these specialized tools:');
    const tools = [
      '• GetAccountInfoTool - Account details and balances',
      '• TransferTokensTool - Send XRD and custom tokens',
      '• CreateFungibleResourceTool - Create new tokens',
      '• CreateNonFungibleResourceTool - Create NFT collections',
      '• AddLiquidityTool - Add liquidity to pools',
      '• SwapTokensTool - Swap between tokens',
      '• StakeXRDTool - Stake XRD with validators',
      '• CallComponentMethodTool - Interact with smart contracts'
    ];
    tools.forEach(tool => log(styles.dim, tool));

    // Demo 6: Interactive Examples
    logSection('Try These Commands');
    log(styles.info, '💬 You can ask your agent questions like:');
    const examples = [
      '"What tokens do I own?"',
      '"Send 10 XRD to account_tdx_2_..."',
      '"Create a token called GameCoin with 1M supply"',
      '"Stake 100 XRD with the best validator"',
      '"What\'s the current epoch?"',
      '"Show me all my account details"'
    ];
    examples.forEach(example => log(styles.dim, `  ${example}`));

    // Demo 7: Show helpful resources
    logSection('Next Steps & Resources');
    log(styles.success, '🎉 Demo completed successfully!');
    log(styles.info, '📚 Resources:');
    log(styles.dim, '  • Docs: https://docs.radix-agent-kit.com');
    log(styles.dim, '  • Stokenet Faucet: https://stokenet-faucet.radixdlt.com/');
    log(styles.dim, '  • Radix Dashboard: https://stokenet-dashboard.radixdlt.com/');
    log(styles.dim, '  • GitHub: https://github.com/tolgayayci/radix-agent-kit');

    console.log();
    log(styles.warning, '⚠️  Remember: This is Stokenet (testnet) - no real value!');
    log(styles.info, '🔄 Run specific demos with: npm run demo:basic, demo:tokens, etc.');

  } catch (error) {
    log(styles.error, `❌ Demo failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the demo
main().catch(console.error); 