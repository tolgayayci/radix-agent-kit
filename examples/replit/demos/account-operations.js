import 'dotenv/config';
import { RadixAgent, RadixNetwork } from 'radix-agent-kit';

/**
 * Comprehensive demo of account and wallet operations using agent-centric approach
 * 
 * This demo shows how users can interact with RadixAgent through natural language
 * for all operations including wallet funding, balance checking, and transactions.
 */

async function main() {
  console.log('🏦 Account & Wallet Operations Demo');
  console.log('Agent-centric approach: Everything through natural language!\n');

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Missing OPENAI_API_KEY');
    process.exit(1);
  }

  try {
    console.log('🔧 Creating Radix Agent (no auto-funding, user-driven approach)...');
    
    // Create agent - new approach doesn't auto-fund, user requests it
    const agent = new RadixAgent({
      networkId: RadixNetwork.Stokenet,
      openaiApiKey: process.env.OPENAI_API_KEY,
      applicationName: 'RadixAgentKitDemo'
    });

    // Initialize agent (creates wallet but doesn't auto-fund)
    await agent.initialize();

    console.log('\n📋 Testing agent-driven operations through natural language...\n');

    // Test 1: Check initial balance
    console.log('--- Test 1: Check Initial Balance ---');
    console.log('Query: "What is my current XRD balance?"');
    const initialBalance = await agent.run('What is my current XRD balance?');
    console.log('🤖 Agent Response:', initialBalance + '\n');

    // Test 2: Fund wallet through agent
    console.log('--- Test 2: Fund Wallet via Agent (Works Regardless of Balance!) ---');
    console.log('Query: "Fund my wallet with testnet XRD"');
    console.log('💡 Note: This will work even if wallet already has sufficient funds');
    const fundingResult = await agent.run('Fund my wallet with testnet XRD');
    console.log('🤖 Agent Response:', fundingResult + '\n');

    // Test 3: Check balance after funding
    console.log('--- Test 3: Check Balance After Funding ---');
    console.log('Query: "Show my XRD balance now"');
    const postFundingBalance = await agent.run('Show my XRD balance now');
    console.log('🤖 Agent Response:', postFundingBalance + '\n');

    // Test 4: Try funding again to show it works multiple times
    console.log('--- Test 4: Fund Again (Demonstrates On-Demand Funding) ---');
    console.log('Query: "Fund my wallet again please"');
    const secondFunding = await agent.run('Fund my wallet again please');
    console.log('🤖 Agent Response:', secondFunding + '\n');

    // Test 5: Get detailed account info
    console.log('--- Test 5: Get Account Information ---');
    console.log('Query: "Get my complete account information"');
    const accountInfo = await agent.run('Get my complete account information');
    console.log('🤖 Agent Response:', accountInfo + '\n');

    // Test 6: Show all balances and assets
    console.log('--- Test 6: Show All Assets ---');
    console.log('Query: "Show me all my token balances and assets"');
    const allAssets = await agent.run('Show me all my token balances and assets');
    console.log('🤖 Agent Response:', allAssets + '\n');

    // Test 7: Get current epoch (network info)
    console.log('--- Test 7: Network Information ---');
    console.log('Query: "What is the current epoch of the Radix network?"');
    const epochInfo = await agent.run('What is the current epoch of the Radix network?');
    console.log('🤖 Agent Response:', epochInfo + '\n');

    console.log('✅ All tests completed successfully!');
    console.log('\n🎯 Key Features Demonstrated:');
    console.log('• Agent creates wallet automatically when needed');
    console.log('• Users can fund wallets through natural language');
    console.log('• Balance checking via conversational interface');
    console.log('• Account operations through agent queries');
    console.log('• No manual funding URLs or complex setup needed');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  // Graceful shutdown
  setTimeout(() => {
    console.log('\n👋 Demo completed. Exiting...');
    process.exit(0);
  }, 2000);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Demo interrupted. Exiting...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Demo terminated. Exiting...');
  process.exit(0);
});

main().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
}); 