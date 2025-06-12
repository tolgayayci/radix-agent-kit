import 'dotenv/config';
import { RadixAgent, RadixNetwork } from './src/index';

/**
 * Basic Test - Show wallet addresses and test simple operations
 */

async function main() {
  console.log('🧪 Basic Wallet Test\n');

  try {
    // Create agents without OpenAI key to avoid API calls
    console.log('🔄 Creating test wallets...');
    
    const agent1 = new RadixAgent({
      networkId: RadixNetwork.Stokenet,
      applicationName: 'BasicTest1',
      verbose: false // Reduce verbosity
    });

    const agent2 = new RadixAgent({
      networkId: RadixNetwork.Stokenet,
      applicationName: 'BasicTest2',
      verbose: false
    });

    // Initialize agents
    await agent1.initialize();
    await agent2.initialize();

    const wallet1 = agent1.getWallet();
    const wallet2 = agent2.getWallet();

    console.log('\n📍 WALLET ADDRESSES:');
    console.log('=====================================');
    console.log(`🔑 Wallet 1: ${wallet1?.getAddress()}`);
    console.log(`🔑 Wallet 2: ${wallet2?.getAddress()}`);
    console.log('=====================================\n');

    console.log('🌐 DASHBOARD LINKS:');
    console.log(`🔗 Wallet 1: https://stokenet-dashboard.radixdlt.com/account/${wallet1?.getAddress()}`);
    console.log(`🔗 Wallet 2: https://stokenet-dashboard.radixdlt.com/account/${wallet2?.getAddress()}\n`);

    console.log('🔍 MNEMONIC PHRASES (FOR TESTING):');
    console.log('===================================');
    console.log(`�� Wallet 1 Mnemonic: ${(wallet1 as any)?.getMnemonic?.() || 'N/A'}`);
    console.log(`📝 Wallet 2 Mnemonic: ${(wallet2 as any)?.getMnemonic?.() || 'N/A'}\n`);

    // Test simple operations without complex AI
    console.log('💰 Testing funding...');
    try {
      // Try to fund wallet 1
      const result1 = await agent1.run('fund my wallet');
      console.log('📋 Funding result 1:', result1.substring(0, 100) + (result1.length > 100 ? '...' : ''));
    } catch (error) {
      console.log('⚠️ Funding failed (no API key), but that\'s expected');
    }

    console.log('\n✅ Basic test completed!');
    console.log('Now you can manually fund these wallets and test token operations.');

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
  }

  process.exit(0);
}

main().catch(error => {
  console.error('💥 Error:', error);
  process.exit(1);
}); 