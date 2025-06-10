import 'dotenv/config';
import { RadixAgent, RadixNetwork } from 'radix-agent-kit';

async function testWithFreshWallet() {
  try {
    
    const agent = new RadixAgent({
      networkId: RadixNetwork.Stokenet,
      openaiApiKey: process.env.OPENAI_API_KEY,
      applicationName: 'FreshWalletTest'
    });

    await agent.initialize();
    
    console.log('✅ Agent initialized with fresh wallet');
    console.log('📍 Wallet Address:', agent.getWallet().getAddress());
    console.log('🛠️  Tools Available:', agent.getTools().length);
    console.log('');

    // Step 1: Check initial balance (should be 0 for fresh wallet)
    console.log('--- Step 1: Check Fresh Wallet Balance ---');
    const initialCheck = await agent.run('What is my current XRD balance?');
    console.log('Initial Balance:', initialCheck);
    console.log('');

    // Step 2: Fund the fresh wallet
    console.log('--- Step 2: Fund Fresh Wallet ---');
    console.log('Request: "Fund my wallet with testnet XRD"');
    const fundingResult = await agent.run('Fund my wallet with testnet XRD');
    console.log('Funding Result:', fundingResult);
    console.log('');

    // Step 3: Check balance after funding
    console.log('--- Step 3: Verify Funding Worked ---');
    const finalCheck = await agent.run('What is my XRD balance now?');
    console.log('Final Balance:', finalCheck);
    console.log('');

    console.log('🔍 Analysis:');
    console.log('- Fresh wallets should start with 0 XRD');
    console.log('- Funding should add ~10,000 XRD');
    console.log('- Final balance should reflect the funding');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  setTimeout(() => process.exit(0), 2000);
}

console.log('Testing funding with completely fresh wallet...\n');
testWithFreshWallet(); 