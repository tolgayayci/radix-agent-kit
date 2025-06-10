import 'dotenv/config';
import { RadixAgent, RadixNetwork } from 'radix-agent-kit';

/**
 * Simple Staking Operations Demo
 * Tests ONLY the 3 core staking functions: stake, unstake, claim
 */

async function main() {
  console.log('🪙 Simple Staking Demo - Testing 3 Core Functions\n');

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Missing OPENAI_API_KEY');
    console.error('💡 Create a .env file with: OPENAI_API_KEY=your_key_here');
    process.exit(1);
  }

  try {
    // Create agent
    console.log('🤖 Creating agent...');
    const agent = new RadixAgent({
      networkId: RadixNetwork.Stokenet,
      openaiApiKey: process.env.OPENAI_API_KEY,
      applicationName: 'SimpleStakingDemo',
      verbose: false
    });

    await agent.initialize();
    
    // Get wallet info
    const agentInfo = agent.getInfo();
    const walletAddress = agentInfo?.walletAddress;
    
    if (walletAddress) {
      console.log(`📍 Wallet: ${walletAddress}`);
      console.log(`🔗 Dashboard: https://stokenet-dashboard.radixdlt.com/account/${walletAddress}/staking\n`);
    }

    const VALIDATOR = 'validator_tdx_2_1sdx3u8mhd3yt537jy5g3psaypmlx0dk2x78efev2qw8kl7a7c5c48y';

    // 1. Fund wallet
    console.log('💰 Funding wallet...');
    const fundResult = await agent.run('Fund my wallet with testnet XRD');
    console.log('Result:', fundResult.slice(0, 100) + '...\n');

    // 2. Stake XRD
    console.log('🎯 TEST 1: Stake XRD');
    const stakeResult = await agent.run(`I want to stake XRD. Please stake 20 XRD with validator ${VALIDATOR}`);
    console.log('Result:', stakeResult.slice(0, 100) + '...\n');
    
    // Wait for transaction
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 3. Unstake XRD
    console.log('🎯 TEST 2: Unstake XRD');
    const unstakeResult = await agent.run(`I want to unstake XRD. Please unstake 1 stake unit from validator ${VALIDATOR}`);
    console.log('Result:', unstakeResult.slice(0, 100) + '...\n');
    
    // Wait for transaction
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 4. Claim XRD
    console.log('🎯 TEST 3: Claim XRD');
    const claimResult = await agent.run(`I want to claim XRD rewards. Please claim rewards from validator ${VALIDATOR}`);
    console.log('Result:', claimResult.slice(0, 100) + '...\n');
    
    if (walletAddress) {
      console.log(`\n🔗 Verify on dashboard: https://stokenet-dashboard.radixdlt.com/account/${walletAddress}/staking`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  // Exit after 2 seconds
  setTimeout(() => {
    console.log('\n👋 Demo completed');
    process.exit(0);
  }, 2000);
}

// Handle interruption
process.on('SIGINT', () => {
  console.log('\n👋 Demo interrupted');
  process.exit(0);
});

main().catch(error => {
  console.error('💥 Error:', error);
  process.exit(1);
});
