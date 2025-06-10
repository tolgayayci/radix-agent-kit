#!/usr/bin/env node

import 'dotenv/config';
import { createRadixAgent, RadixNetwork } from 'radix-agent-kit';

/**
 * Radix Agent Kit - Replit Demo
 * 
 * This demo shows automatic wallet creation and AI-powered blockchain interactions
 * No mnemonic required - a wallet will be created automatically with funding!
 */
async function main() {
  console.log('🚀 Radix Agent Kit Demo');
  console.log('='.repeat(40));

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Missing OPENAI_API_KEY in environment variables');
    console.log('💡 Add your OpenAI API key to the .env file');
    process.exit(1);
  }

  try {
    console.log('🔧 Initializing Radix Agent...');
    
    // Create agent without mnemonic - will auto-create wallet on Stokenet
    const agent = await createRadixAgent({
      networkId: RadixNetwork.Mainnet, // Will be forced to Stokenet for security
      openaiApiKey: process.env.OPENAI_API_KEY,
      applicationName: 'ReplicDemo',
      verbose: false
    });

    const wallet = agent.getWallet();
    if (!wallet) {
      throw new Error('Wallet creation failed');
    }

    console.log('🤖 Agent ready! Try asking questions like:');
    console.log('   • "What is my account balance?"');
    console.log('   • "Get my account information"');
    console.log('   • "What is the current epoch?"');
    console.log('\n' + '='.repeat(40));

    // Interactive demo
    const queries = [
      'What is my account balance?',
      'What is the current epoch?'
    ];

    for (const query of queries) {
      console.log(`\n💬 Query: "${query}"`);
      console.log('🤖 Agent Response:');
      const response = await agent.run(query);
      console.log(response);
      console.log('-'.repeat(40));
    }

    console.log('\n✅ Demo completed successfully!');
    console.log('🔗 View your account: https://stokenet-dashboard.radixdlt.com/account/' + wallet.getAddress());
    
    // Clean exit
    setTimeout(() => {
      console.log('👋 Goodbye!');
      process.exit(0);
    }, 1000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Demo interrupted. Goodbye!');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Demo terminated. Goodbye!');
  process.exit(0);
});

main().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
}); 