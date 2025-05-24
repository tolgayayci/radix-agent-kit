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

    // If no mnemonic, generate new wallet
    if (!process.env.RADIX_MNEMONIC) {
      const { wallet, mnemonic } = agent.generateNewWallet();
      console.log(`🔑 New wallet: ${wallet.getAddress()}`);
      console.log(`💾 Mnemonic: ${mnemonic}\n`);
    }

    console.log(`📍 Wallet: ${agent.getWallet()?.getAddress()}\n`);

    // Basic AI interactions
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