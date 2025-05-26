import 'dotenv/config';
import { RadixAgent, RadixNetwork } from 'radix-agent-kit';

console.log('🤖 Basic Agent Demo - Simple AI Blockchain Interactions\n');

async function basicDemo() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Please set OPENAI_API_KEY in your .env file');
    process.exit(1);
  }

  try {
    // Create agent
    const agent = new RadixAgent({
      networkId: RadixNetwork.Stokenet,
      openaiApiKey: process.env.OPENAI_API_KEY,
      mnemonic: process.env.RADIX_MNEMONIC,
      applicationName: 'BasicDemo'
    });

    // If no mnemonic, generate new wallet with PROPER address
    if (!process.env.RADIX_MNEMONIC) {
      const walletInfo = await agent.generateNewWalletAsync();
      console.log(`🔑 New wallet: ${walletInfo.wallet.getAddress()}`);
      console.log(`💾 Mnemonic: ${walletInfo.mnemonic}\n`);
    }

    const wallet = agent.getWallet();
    const walletAddress = wallet ? wallet.getAddress() : 'No wallet available';
    console.log(`📍 Wallet: ${walletAddress}\n`);

    // Validate address format
    if (walletAddress.startsWith('account_tdx_2_')) {
      console.log('✅ Address format is CORRECT!\n');
    } else {
      console.log(`❌ Address format is WRONG: ${walletAddress}\n`);
    }

    // Basic AI interactions
    console.log('💬 Asking: "What\'s my account address?"');
    const address = await agent.run("What's my account address?");
    console.log(`🤖 Agent: ${address}\n`);

    console.log('💬 Asking: "What\'s my XRD balance?"');
    const balance = await agent.run("What's my XRD balance?");
    console.log(`🤖 Agent: ${balance}\n`);

    console.log('💬 Asking: "What is the current epoch?"');
    const epoch = await agent.run("What is the current epoch?");
    console.log(`🤖 Agent: ${epoch}\n`);

    console.log('💬 Asking: "Show me my account information"');
    const accountInfo = await agent.run("Show me my account information");
    console.log(`🤖 Agent: ${accountInfo}\n`);

    console.log('✅ Basic demo completed!');
    console.log('💡 Try running other demos: npm run demo:tokens, demo:defi, etc.');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
  }
}

basicDemo(); 