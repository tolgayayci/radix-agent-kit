import 'dotenv/config';
import { RadixAgent, RadixNetwork } from 'radix-agent-kit';

console.log('🏊‍♂️ DeFi Operations Demo - Liquidity Pools and Token Swapping\n');

async function defiDemo() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Please set OPENAI_API_KEY in your .env file');
    process.exit(1);
  }

  try {
    const agent = new RadixAgent({
      networkId: RadixNetwork.Stokenet,
      openaiApiKey: process.env.OPENAI_API_KEY,
      mnemonic: process.env.RADIX_MNEMONIC,
      applicationName: 'DeFiDemo'
    });

    if (!process.env.RADIX_MNEMONIC) {
      const { wallet, mnemonic } = agent.generateNewWallet();
      console.log(`🔑 New wallet: ${wallet.getAddress()}`);
      console.log(`💾 Save this mnemonic: ${mnemonic}\n`);
    }

    console.log(`📍 Wallet: ${agent.getWallet()?.getAddress()}\n`);

    // Check balance first
    console.log('💰 Checking XRD balance...');
    const balance = await agent.run("What's my XRD balance?");
    console.log(`🤖 ${balance}\n`);

    // Note about prerequisites
    console.log('📋 DeFi Operations Demo');
    console.log('⚠️  Note: For DeFi operations, you need:');
    console.log('   1. XRD for transaction fees');
    console.log('   2. Tokens to create pools/swap');
    console.log('   3. Existing liquidity pools for swapping\n');

    // Demo 1: Explain how to create a liquidity pool
    console.log('🏊‍♂️ Creating Liquidity Pool Example:');
    console.log('💬 To create a liquidity pool, you would ask:');
    console.log('   "Create a liquidity pool with 1000 XRD and 500 MyToken"');
    console.log('   This requires you to have both XRD and MyToken\n');

    // Demo 2: Show how to add liquidity
    console.log('➕ Adding Liquidity Example:');
    console.log('💬 To add liquidity to an existing pool, ask:');
    console.log('   "Add 100 XRD and 50 MyToken to the XRD/MyToken pool"');
    console.log('   "Add liquidity to pool address pool_tdx_2_1c8..."\n');

    // Demo 3: Token swapping examples
    console.log('🔄 Token Swapping Examples:');
    console.log('💬 To swap tokens, you can ask:');
    console.log('   "Swap 50 XRD for MyToken"');
    console.log('   "Exchange 100 TokenA for TokenB"');
    console.log('   "Convert 25 XRD to the best available token"\n');

    // Demo 4: Check pool information
    console.log('📊 Pool Information Examples:');
    console.log('💬 To get pool information, ask:');
    console.log('   "What pools are available?"');
    console.log('   "Show me pool information for XRD/MyToken"');
    console.log('   "What\'s the current price in the XRD/MyToken pool?"\n');

    // Try a real query about pools (this should work even without tokens)
    console.log('🔍 Checking for available pools...');
    console.log('💬 Asking: "What DeFi pools or components are available on Stokenet?"');
    try {
      const poolInfo = await agent.run("What DeFi pools or components are available on Stokenet?");
      console.log(`🤖 ${poolInfo}\n`);
    } catch (error) {
      console.log(`❌ Pool query failed: ${error.message}\n`);
    }

    // Practical steps
    console.log('🚀 To actually perform DeFi operations:');
    console.log('   1. Get testnet XRD: https://stokenet-faucet.radixdlt.com/');
    console.log('   2. Create tokens first: npm run demo:tokens');
    console.log('   3. Then create pools and swap');
    console.log('   4. Always test with small amounts first\n');

    console.log('✅ DeFi operations demo completed!');
    console.log('💡 Next: Try npm run demo:staking for staking operations');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
  }
}

defiDemo(); 