const { RadixAgent } = require('./dist/agent/RadixAgent');
const { RadixMnemonicWallet } = require('./dist/radix/MnemonicWallet');
const { RadixWalletFactory } = require('./dist/radix/MnemonicWallet');
const { NetworkId } = require('@radixdlt/radix-engine-toolkit');

async function testAllWalletCreationMethods() {
  console.log('🧪 COMPREHENSIVE WALLET CREATION & AUTO-FUNDING TEST');
  console.log('===================================================\n');
  
  const results = [];
  
  try {
    // Test 1: RadixAgent.generateNewWallet() (sync)
    console.log('📍 Test 1: RadixAgent.generateNewWallet() (sync method)');
    console.log('--------------------------------------------------------');
    
    const agent1 = new RadixAgent({
      networkId: 'stokenet',
      applicationName: 'Test Agent 1'
    });
    
    const { wallet: wallet1, mnemonic: mnemonic1 } = agent1.generateNewWallet();
    console.log(`🔑 Wallet 1: ${wallet1.getAddress()}`);
    console.log(`🌐 Explorer: https://stokenet-dashboard.radixdlt.com/account/${wallet1.getAddress()}`);
    
    // Wait for auto-funding
    await new Promise(resolve => setTimeout(resolve, 10000));
    const balance1 = await agent1.getFaucetHelper().getXRDBalance(wallet1);
    console.log(`💎 Balance: ${balance1} XRD`);
    
    results.push({
      method: 'RadixAgent.generateNewWallet()',
      address: wallet1.getAddress(),
      balance: balance1,
      funded: balance1 > 0
    });
    
    // Test 2: RadixAgent.generateNewWalletAsync() (async)
    console.log('\n📍 Test 2: RadixAgent.generateNewWalletAsync() (async method)');
    console.log('--------------------------------------------------------------');
    
    const agent2 = new RadixAgent({
      networkId: 'stokenet',
      applicationName: 'Test Agent 2'
    });
    
    const { wallet: wallet2, mnemonic: mnemonic2 } = await agent2.generateNewWalletAsync();
    console.log(`🔑 Wallet 2: ${wallet2.getAddress()}`);
    console.log(`🌐 Explorer: https://stokenet-dashboard.radixdlt.com/account/${wallet2.getAddress()}`);
    
    // Check balance immediately (should be funded already)
    const balance2 = await agent2.getFaucetHelper().getXRDBalance(wallet2);
    console.log(`💎 Balance: ${balance2} XRD`);
    
    results.push({
      method: 'RadixAgent.generateNewWalletAsync()',
      address: wallet2.getAddress(),
      balance: balance2,
      funded: balance2 > 0
    });
    
    // Test 3: RadixAgent.createWalletFromMnemonic() (existing mnemonic)
    console.log('\n📍 Test 3: RadixAgent.createWalletFromMnemonic() (existing mnemonic)');
    console.log('------------------------------------------------------------------');
    
    const agent3 = new RadixAgent({
      networkId: 'stokenet',
      applicationName: 'Test Agent 3'
    });
    
    // Use a new mnemonic to test funding check
    const testMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art';
    const wallet3 = agent3.createWalletFromMnemonic(testMnemonic);
    console.log(`🔑 Wallet 3: ${wallet3.getAddress()}`);
    console.log(`🌐 Explorer: https://stokenet-dashboard.radixdlt.com/account/${wallet3.getAddress()}`);
    
    // Wait for balance check and potential funding
    await new Promise(resolve => setTimeout(resolve, 10000));
    const balance3 = await agent3.getFaucetHelper().getXRDBalance(wallet3);
    console.log(`💎 Balance: ${balance3} XRD`);
    
    results.push({
      method: 'RadixAgent.createWalletFromMnemonic()',
      address: wallet3.getAddress(),
      balance: balance3,
      funded: balance3 > 0
    });
    
    // Test 4: RadixMnemonicWallet.generateRandom() (direct static method)
    console.log('\n📍 Test 4: RadixMnemonicWallet.generateRandom() (direct static)');
    console.log('---------------------------------------------------------------');
    
    const wallet4 = RadixMnemonicWallet.generateRandom({
      networkId: NetworkId.Stokenet,
      applicationName: 'Direct Test 4'
    });
    console.log(`🔑 Wallet 4: ${wallet4.getAddress()}`);
    console.log(`🌐 Explorer: https://stokenet-dashboard.radixdlt.com/account/${wallet4.getAddress()}`);
    
    // Wait for auto-funding
    await new Promise(resolve => setTimeout(resolve, 10000));
    const agent4 = new RadixAgent({ networkId: 'stokenet', applicationName: 'Helper' });
    const balance4 = await agent4.getFaucetHelper().getXRDBalance(wallet4);
    console.log(`💎 Balance: ${balance4} XRD`);
    
    results.push({
      method: 'RadixMnemonicWallet.generateRandom()',
      address: wallet4.getAddress(),
      balance: balance4,
      funded: balance4 > 0
    });
    
    // Test 5: RadixMnemonicWallet.generateRandomAsync() (direct static async)
    console.log('\n📍 Test 5: RadixMnemonicWallet.generateRandomAsync() (direct static async)');
    console.log('--------------------------------------------------------------------------');
    
    const wallet5 = await RadixMnemonicWallet.generateRandomAsync({
      networkId: NetworkId.Stokenet,
      applicationName: 'Direct Test 5'
    });
    console.log(`🔑 Wallet 5: ${wallet5.getAddress()}`);
    console.log(`🌐 Explorer: https://stokenet-dashboard.radixdlt.com/account/${wallet5.getAddress()}`);
    
    // Check balance immediately (should be funded already)
    const balance5 = await agent4.getFaucetHelper().getXRDBalance(wallet5);
    console.log(`💎 Balance: ${balance5} XRD`);
    
    results.push({
      method: 'RadixMnemonicWallet.generateRandomAsync()',
      address: wallet5.getAddress(),
      balance: balance5,
      funded: balance5 > 0
    });
    
    // Test 6: RadixWalletFactory.createNew() (factory method)
    console.log('\n📍 Test 6: RadixWalletFactory.createNew() (factory method)');
    console.log('-----------------------------------------------------------');
    
    const wallet6 = RadixWalletFactory.createNew({
      networkId: NetworkId.Stokenet,
      applicationName: 'Factory Test 6'
    });
    console.log(`🔑 Wallet 6: ${wallet6.getAddress()}`);
    console.log(`🌐 Explorer: https://stokenet-dashboard.radixdlt.com/account/${wallet6.getAddress()}`);
    
    // Wait for auto-funding
    await new Promise(resolve => setTimeout(resolve, 10000));
    const balance6 = await agent4.getFaucetHelper().getXRDBalance(wallet6);
    console.log(`💎 Balance: ${balance6} XRD`);
    
    results.push({
      method: 'RadixWalletFactory.createNew()',
      address: wallet6.getAddress(),
      balance: balance6,
      funded: balance6 > 0
    });
    
    // Summary
    console.log('\n📋 COMPREHENSIVE TEST RESULTS');
    console.log('==============================');
    
    let totalTested = results.length;
    let totalFunded = results.filter(r => r.funded).length;
    let totalUnfunded = totalTested - totalFunded;
    
    results.forEach((result, index) => {
      const status = result.funded ? '✅' : '❌';
      console.log(`${status} ${result.method}`);
      console.log(`   Address: ${result.address}`);
      console.log(`   Balance: ${result.balance} XRD`);
      console.log(`   Explorer: https://stokenet-dashboard.radixdlt.com/account/${result.address}`);
      console.log('');
    });
    
    console.log('📊 SUMMARY STATISTICS:');
    console.log(`   Total Methods Tested: ${totalTested}`);
    console.log(`   Successfully Funded: ${totalFunded}`);
    console.log(`   Failed to Fund: ${totalUnfunded}`);
    console.log(`   Success Rate: ${((totalFunded / totalTested) * 100).toFixed(1)}%`);
    
    if (totalFunded === totalTested) {
      console.log('\n🎉 SUCCESS: ALL wallet creation methods have working auto-funding!');
    } else if (totalFunded > 0) {
      console.log('\n⚠️ PARTIAL SUCCESS: Some methods have auto-funding issues');
    } else {
      console.log('\n❌ FAILURE: Auto-funding is not working for any methods');
    }
    
    console.log('\n🔗 VERIFICATION:');
    console.log('All wallet addresses can be verified on the Radix Stokenet Dashboard');
    console.log('Check transaction history to see faucet funding transactions');
    
  } catch (error) {
    console.error('❌ Comprehensive test failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

testAllWalletCreationMethods().catch(console.error); 