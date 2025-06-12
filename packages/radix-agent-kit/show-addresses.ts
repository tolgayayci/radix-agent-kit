import 'dotenv/config';
import { RadixAgent, RadixNetwork } from './src/index';

/**
 * Show wallet addresses for manual testing
 */

async function main() {
  console.log('🔑 Radix Agent Kit - Test Wallet Addresses\n');

  try {
    // Create 2 test agents
    const agent1 = new RadixAgent({
      networkId: RadixNetwork.Stokenet,
      applicationName: 'TestWallet1',
      verbose: false
    });

    const agent2 = new RadixAgent({
      networkId: RadixNetwork.Stokenet,
      applicationName: 'TestWallet2', 
      verbose: false
    });

    // Initialize
    await agent1.initialize();
    await agent2.initialize();

    const wallet1 = agent1.getWallet();
    const wallet2 = agent2.getWallet();

    console.log('📍 WALLET ADDRESSES:');
    console.log('='.repeat(80));
    console.log(`🔑 Wallet 1: ${wallet1?.getAddress()}`);
    console.log(`🔑 Wallet 2: ${wallet2?.getAddress()}`);
    console.log('='.repeat(80));

    console.log('\n🌐 STOKENET DASHBOARD LINKS:');
    console.log(`🔗 Wallet 1: https://stokenet-dashboard.radixdlt.com/account/${wallet1?.getAddress()}`);
    console.log(`🔗 Wallet 2: https://stokenet-dashboard.radixdlt.com/account/${wallet2?.getAddress()}`);

    console.log('\n📝 MNEMONIC PHRASES (Save these for testing):');
    console.log('-'.repeat(80));
    console.log(`Wallet 1: ${(wallet1 as any)?.getMnemonic?.() || 'N/A'}`);
    console.log(`Wallet 2: ${(wallet2 as any)?.getMnemonic?.() || 'N/A'}`);
    console.log('-'.repeat(80));

    console.log('\n💡 INSTRUCTIONS:');
    console.log('1. Copy the wallet addresses above');
    console.log('2. Use them in your Replit demo for testing');
    console.log('3. Fund the wallets manually or via the agent');
    console.log('4. Test all 5 operations:');
    console.log('   ✅ Create Fungible Token');  
    console.log('   ✅ Create NFT Collection');
    console.log('   ⏳ Mint Fungible (needs resource address)');
    console.log('   ⏳ Mint NFT (needs resource address)');
    console.log('   ✅ Transfer XRD');

    console.log('\n🎯 NOTE: Minting operations require resource addresses');
    console.log('   Check the dashboard after creating tokens to get resource addresses');

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
  }

  process.exit(0);
}

main().catch(error => {
  console.error('💥 Error:', error);
  process.exit(1);
}); 