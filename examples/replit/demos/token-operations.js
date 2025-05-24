import 'dotenv/config';
import { RadixAgent, RadixNetwork } from 'radix-agent-kit';

console.log('🪙 Token Operations Demo - Creating and Managing Tokens\n');

async function tokenDemo() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Please set OPENAI_API_KEY in your .env file');
    process.exit(1);
  }

  try {
    const agent = new RadixAgent({
      networkId: RadixNetwork.Stokenet,
      openaiApiKey: process.env.OPENAI_API_KEY,
      mnemonic: process.env.RADIX_MNEMONIC,
      applicationName: 'TokenDemo'
    });

    if (!process.env.RADIX_MNEMONIC) {
      const { wallet, mnemonic } = agent.generateNewWallet();
      console.log(`🔑 New wallet: ${wallet.getAddress()}`);
      console.log(`💾 Save this mnemonic: ${mnemonic}\n`);
    }

    console.log(`📍 Wallet: ${agent.getWallet()?.getAddress()}\n`);

    // Check initial balance
    console.log('💰 Checking initial XRD balance...');
    const initialBalance = await agent.run("What's my XRD balance?");
    console.log(`🤖 ${initialBalance}\n`);

    // Create a fungible token
    console.log('🪙 Creating a fungible token...');
    console.log('💬 Asking: "Create a fungible token called DemoToken with symbol DEMO and 1000000 initial supply"');
    try {
      const tokenResult = await agent.run("Create a fungible token called DemoToken with symbol DEMO and 1000000 initial supply");
      console.log(`🤖 ${tokenResult}\n`);
    } catch (error) {
      console.log(`❌ Token creation failed: ${error.message}`);
      if (error.message.includes('insufficient')) {
        console.log('💡 You need XRD for transaction fees. Get testnet XRD from:');
        console.log('   https://stokenet-faucet.radixdlt.com/\n');
      }
    }

    // Create an NFT collection
    console.log('🎨 Creating an NFT collection...');
    console.log('💬 Asking: "Create an NFT collection called DemoNFTs with description \'Demo NFT Collection\'"');
    try {
      const nftResult = await agent.run("Create an NFT collection called DemoNFTs with description 'Demo NFT Collection'");
      console.log(`🤖 ${nftResult}\n`);
    } catch (error) {
      console.log(`❌ NFT creation failed: ${error.message}\n`);
    }

    // Check all tokens owned
    console.log('📋 Checking all tokens owned...');
    console.log('💬 Asking: "What tokens do I own?"');
    try {
      const allTokens = await agent.run("What tokens do I own?");
      console.log(`🤖 ${allTokens}\n`);
    } catch (error) {
      console.log(`❌ Failed to get tokens: ${error.message}\n`);
    }

    // Show example transfer (won't execute without real recipient)
    console.log('📤 Token transfer example:');
    console.log('💬 To transfer tokens, you would ask:');
    console.log('   "Send 100 DEMO tokens to account_tdx_2_1c8..."');
    console.log('   "Transfer 50 XRD to my friend\'s address"\n');

    console.log('✅ Token operations demo completed!');
    console.log('💡 Next: Try running npm run demo:defi for DeFi operations');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
  }
}

tokenDemo(); 