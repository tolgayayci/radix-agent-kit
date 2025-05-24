import 'dotenv/config';
import { RadixAgent, RadixNetwork } from 'radix-agent-kit';

console.log('🥩 Staking Demo - XRD Staking with Validators\n');

async function stakingDemo() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Please set OPENAI_API_KEY in your .env file');
    process.exit(1);
  }

  try {
    const agent = new RadixAgent({
      networkId: RadixNetwork.Stokenet,
      openaiApiKey: process.env.OPENAI_API_KEY,
      mnemonic: process.env.RADIX_MNEMONIC,
      applicationName: 'StakingDemo'
    });

    if (!process.env.RADIX_MNEMONIC) {
      const { wallet, mnemonic } = agent.generateNewWallet();
      console.log(`🔑 New wallet: ${wallet.getAddress()}`);
      console.log(`💾 Save this mnemonic: ${mnemonic}\n`);
    }

    console.log(`📍 Wallet: ${agent.getWallet()?.getAddress()}\n`);

    // Check XRD balance first
    console.log('💰 Checking XRD balance...');
    const balance = await agent.run("What's my XRD balance?");
    console.log(`🤖 ${balance}\n`);

    // Get current epoch information
    console.log('📅 Getting current epoch information...');
    console.log('💬 Asking: "What is the current epoch?"');
    try {
      const epochInfo = await agent.run("What is the current epoch?");
      console.log(`🤖 ${epochInfo}\n`);
    } catch (error) {
      console.log(`❌ Epoch query failed: ${error.message}\n`);
    }

    // Staking prerequisites
    console.log('📋 Staking Prerequisites:');
    console.log('   • XRD tokens (minimum amount varies)');
    console.log('   • Valid validator address');
    console.log('   • Understanding of staking periods\n');

    // Demo staking examples
    console.log('🥩 Staking Examples:');
    console.log('💬 To stake XRD with a validator, ask:');
    console.log('   "Stake 100 XRD with validator_tdx_2_1c8..."');
    console.log('   "Find the best validator and stake 50 XRD"');
    console.log('   "Stake 200 XRD with the highest APY validator"\n');

    // Check staking status examples
    console.log('📊 Checking Staking Status:');
    console.log('💬 To check your staking positions, ask:');
    console.log('   "What are my staking positions?"');
    console.log('   "Show me my staking rewards"');
    console.log('   "What validators am I staking with?"\n');

    // Unstaking examples
    console.log('🔄 Unstaking Examples:');
    console.log('💬 To unstake XRD, ask:');
    console.log('   "Unstake 50 XRD from validator_tdx_2_1c8..."');
    console.log('   "Withdraw all my staked XRD"');
    console.log('   "Claim my staking rewards"\n');

    // Try to get validator information
    console.log('🔍 Checking validator information...');
    console.log('💬 Asking: "What validators are available for staking?"');
    try {
      const validatorInfo = await agent.run("What validators are available for staking?");
      console.log(`🤖 ${validatorInfo}\n`);
    } catch (error) {
      console.log(`❌ Validator query failed: ${error.message}\n`);
    }

    // Important staking notes
    console.log('⚠️  Important Staking Notes:');
    console.log('   • Staking locks your XRD for a period');
    console.log('   • Rewards are distributed over time');
    console.log('   • Choose validators carefully (uptime, fees)');
    console.log('   • You can stake with multiple validators');
    console.log('   • Unstaking may have waiting periods\n');

    // Practical steps
    console.log('🚀 To start staking:');
    console.log('   1. Get testnet XRD: https://stokenet-faucet.radixdlt.com/');
    console.log('   2. Research validators on Stokenet dashboard');
    console.log('   3. Start with small amounts to test');
    console.log('   4. Monitor your staking positions regularly\n');

    console.log('🌐 Useful Resources:');
    console.log('   • Stokenet Dashboard: https://stokenet-dashboard.radixdlt.com/');
    console.log('   • Validator Explorer: Check validator performance');
    console.log('   • Radix Staking Guide: Official documentation\n');

    console.log('✅ Staking demo completed!');
    console.log('💡 Next: Try npm run demo:direct-api for direct API usage');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
  }
}

stakingDemo(); 