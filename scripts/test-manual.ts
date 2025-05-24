// ==================================================
// RADIX AGENT KIT - MANUAL TESTING SCRIPT
// ==================================================

import { RadixMnemonicWallet } from '../packages/radix-agent-kit/src/radix/MnemonicWallet';
import { RadixGatewayClient, RadixNetwork } from '../packages/radix-agent-kit/src/radix/RadixGatewayClient';
import { RadixTransactionBuilder } from '../packages/radix-agent-kit/src/radix/RadixTransactionBuilder';
import { RadixAccount } from '../packages/radix-agent-kit/src/radix/RadixAccount';
import { NetworkId } from '@radixdlt/radix-engine-toolkit';

async function manualTest() {
  console.log('🧪 Starting Radix Agent Kit Manual Test...\n');
  
  try {
    // 1. Test Wallet Creation
    console.log('1️⃣ Testing Wallet Creation...');
    const wallet = RadixMnemonicWallet.generateRandom({
      networkId: NetworkId.Stokenet,
      applicationName: 'ManualTest'
    });
    
    console.log('✅ Wallet created successfully!');
    console.log('Address:', wallet.getAddress());
    console.log('Mnemonic:', wallet.getMnemonic());
    console.log('');
    
    // 2. Test Gateway Client
    console.log('2️⃣ Testing Gateway Client...');
    const gatewayClient = new RadixGatewayClient({
      networkId: RadixNetwork.Stokenet,
      applicationName: 'ManualTest'
    });
    
    const status = await gatewayClient.getGatewayStatus();
    console.log('✅ Gateway connected!');
    console.log('Current Epoch:', status.ledger_state.epoch);
    console.log('Network:', status.ledger_state.network);
    console.log('');
    
    // 3. Test Transaction Builder
    console.log('3️⃣ Testing Transaction Builder...');
    const txBuilder = new RadixTransactionBuilder({
      networkId: RadixNetwork.Stokenet
    });
    
    const manifest = txBuilder.createTransferManifest(
      wallet.getAddress(),
      'account_tdx_2_1c9aaqt68l4mxp24rywx5ps4l0fzm8cgrzkxe5d3qjy9jgdh38zycf8',
      txBuilder.getXRDResourceAddress(),
      '10'
    );
    
    console.log('✅ Transaction manifest created!');
    console.log('Manifest length:', manifest.length);
    console.log('');
    
    // 4. Test Account Operations
    console.log('4️⃣ Testing Account Operations...');
    const account = new RadixAccount(wallet.getAddress(), gatewayClient);
    
    console.log('✅ Account operations ready!');
    console.log('Account address:', account.getAddress());
    console.log('');
    
    // 5. Test Signing
    console.log('5️⃣ Testing Signing...');
    const testData = new TextEncoder().encode('Hello Radix!');
    const signature = await wallet.sign(testData);
    
    console.log('✅ Signing works!');
    console.log('Signature length:', signature.length);
    console.log('');
    
    console.log('🎉 All manual tests passed! Your Radix Agent Kit is working correctly.');
    
  } catch (error) {
    console.error('❌ Manual test failed:', error);
    process.exit(1);
  }
}

// Run manual test
if (require.main === module) {
  manualTest().catch(console.error);
}

export { manualTest }; 