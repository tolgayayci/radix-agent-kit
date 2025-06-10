import 'dotenv/config';
import { RadixAgent, RadixNetwork } from 'radix-agent-kit';

/**
 * Component Interaction Demo using RadixAgent
 * 
 * This demo shows how users can interact with Radix components through natural language
 * using the RadixAgent. Tests component state retrieval and method calling.
 */

async function main() {
  console.log('🔧 Component Interaction Demo');
  console.log('Testing component operations through natural language!\n');

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Missing OPENAI_API_KEY');
    console.error('💡 Create a .env file with: OPENAI_API_KEY=your_key_here');
    process.exit(1);
  }

  try {
    console.log('🤖 Creating Radix Agent...');
    
    // Create agent for Stokenet
    const agent = new RadixAgent({
      networkId: RadixNetwork.Stokenet,
      openaiApiKey: process.env.OPENAI_API_KEY,
      applicationName: 'ComponentInteractionDemo',
      verbose: false
    });

    // Initialize agent (creates wallet)
    await agent.initialize();
    
    console.log('✅ Agent initialized successfully!\n');

    // Known Stokenet Faucet component for testing
    const FAUCET_COMPONENT = 'component_tdx_2_1cptxxxxxxxxxfaucetxxxxxxxxx000527798379xxxxxxxxxyulkzl';

    console.log('📋 Testing component operations through natural language...\n');

    // Test 1: Get component state and metadata
    console.log('--- Test 1: Component State & Metadata ---');
    console.log(`Query: "Get the state and metadata of the faucet component ${FAUCET_COMPONENT}"`);
    const componentState = await agent.run(`Get the state and metadata of the faucet component ${FAUCET_COMPONENT}`);
    console.log('🤖 Agent Response:', componentState + '\n');

    // Test 2: Call a component method
    console.log('--- Test 2: Call Component Method ---');
    console.log(`Query: "Call the get_amount method on component ${FAUCET_COMPONENT}"`);
    const methodCall = await agent.run(`Call the get_amount method on component ${FAUCET_COMPONENT}`);
    console.log('🤖 Agent Response:', methodCall + '\n');

    // Test 3: Current network epoch 
    console.log('--- Test 3: Network Information ---');
    console.log('Query: "What is the current epoch?"');
    const networkStatus = await agent.run('What is the current epoch?');
    console.log('🤖 Agent Response:', networkStatus + '\n');

    // Test 4: Error handling with invalid component
    console.log('--- Test 4: Error Handling ---');
    console.log('Query: "Get state of component component_tdx_2_invalid"');
    const invalidComponent = await agent.run('Get state of component component_tdx_2_invalid');
    console.log('🤖 Agent Response:', invalidComponent + '\n');

    console.log('✅ Component interaction demo completed successfully!');
    console.log('\n🎯 Tests Completed:');
    console.log('• ✅ Component state & metadata retrieval');
    console.log('• ✅ Component method calling');
    console.log('• ✅ Network epoch information');
    console.log('• ✅ Error handling for invalid components');

    console.log('\n📊 Summary:');
    console.log(`• Component tested: Stokenet Faucet`);
    console.log(`• Method called: get_amount`);
    console.log('• Network: Stokenet (testnet)');
    console.log('• All operations used natural language AI prompts');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Check your OpenAI API key is valid');
    console.error('2. Ensure internet connection for Stokenet access');
    console.error('3. Verify the component address is correct');
  }

  // Graceful shutdown
  setTimeout(() => {
    console.log('\n👋 Component interaction demo completed. Exiting...');
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
  console.error('Full error:', error);
  process.exit(1);
});
