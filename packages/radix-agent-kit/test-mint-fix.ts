import 'dotenv/config';
import { RadixGatewayClient, RadixNetwork } from './src/radix/RadixGatewayClient';
import { RadixTransactionBuilder } from './src/radix/RadixTransactionBuilder';
import { RadixMnemonicWallet } from './src/radix/MnemonicWallet';
import { createCreateFungibleResourceTool, createCreateNonFungibleResourceTool, createMintFungibleResourceTool, createMintNonFungibleResourceTool } from './src/agent/tools';
import { NetworkId } from '@radixdlt/radix-engine-toolkit';

/**
 * Test Mint Fixes - Focus on resource address extraction and minting
 */

async function main() {
  console.log('🧪 Testing Mint Fixes\n');

  try {
    // Initialize services
    const networkId = NetworkId.Stokenet;
    const gatewayClient = new RadixGatewayClient({ networkId: RadixNetwork.Stokenet });
    const transactionBuilder = new RadixTransactionBuilder({ networkId: RadixNetwork.Stokenet });

    // Create test wallet
    console.log('🔄 Creating test wallet...');
    const wallet = RadixMnemonicWallet.generateRandom({
      networkId,
      applicationName: 'MintFixTest'
    });

    console.log(`🔑 Test Wallet: ${wallet.getAddress()}\n`);

    // Fund wallet
    console.log('💰 Funding wallet...');
    try {
      const { FaucetHelper } = await import('./src/utils/FaucetHelper');
      const faucetHelper = new FaucetHelper(RadixNetwork.Stokenet);
      await faucetHelper.fundWalletWithFaucet(wallet);
      console.log('✅ Wallet funded\n');
      
      // Wait for funding
      await new Promise(resolve => setTimeout(resolve, 8000));
    } catch (error) {
      console.log('⚠️ Funding failed:', error);
      return;
    }

    // Create tools
    const createFungibleTool = createCreateFungibleResourceTool(gatewayClient, transactionBuilder, wallet, networkId);
    const createNftTool = createCreateNonFungibleResourceTool(gatewayClient, transactionBuilder, wallet, networkId);
    const mintFungibleTool = createMintFungibleResourceTool(gatewayClient, transactionBuilder, wallet, networkId);
    const mintNftTool = createMintNonFungibleResourceTool(gatewayClient, transactionBuilder, wallet, networkId);

    console.log('======== TESTING FIXED RESOURCE EXTRACTION ========\n');

    // 1. Create Fungible Token (with fixed extraction)
    console.log('1️⃣ Creating fungible token with fixed extraction...');
    const fungibleResult = await createFungibleTool.func({
      input: 'FixedCoin,FC,10000,18'
    });
    console.log('📋 Fungible Result:', fungibleResult);
    
    // Check if resource address is in the response
    const fungibleResourceMatch = fungibleResult.match(/🔗 Resource: (resource_[a-zA-Z0-9_]+)/);
    const fungibleResourceAddress = fungibleResourceMatch ? fungibleResourceMatch[1] : null;
    
    if (fungibleResourceAddress) {
      console.log(`✅ Successfully extracted fungible resource: ${fungibleResourceAddress}\n`);
      
      // Test minting immediately
      console.log('3️⃣ Testing fungible token minting...');
      const mintResult = await mintFungibleTool.func({
        input: `${fungibleResourceAddress},5000`
      });
      console.log('📋 Mint Result:', mintResult);
    } else {
      console.log('❌ Failed to extract fungible resource address\n');
    }

    // 2. Create NFT Collection (with fixed extraction)
    console.log('\n2️⃣ Creating NFT collection with fixed extraction...');
    const nftResult = await createNftTool.func({
      input: 'FixedNFTs,Fixed NFT Collection for testing resource extraction'
    });
    console.log('📋 NFT Result:', nftResult);
    
    // Check if resource address is in the response
    const nftResourceMatch = nftResult.match(/🔗 Resource: (resource_[a-zA-Z0-9_]+)/);
    const nftResourceAddress = nftResourceMatch ? nftResourceMatch[1] : null;
    
    if (nftResourceAddress) {
      console.log(`✅ Successfully extracted NFT resource: ${nftResourceAddress}\n`);
      
      // Test NFT minting immediately
      console.log('4️⃣ Testing NFT minting...');
      const nftMintData = {
        resourceAddress: nftResourceAddress,
        toAccount: wallet.getAddress(),
        nftId: "001",
        metadata: {
          name: "Fixed Test NFT #1",
          description: "First NFT with fixed minting",
          image: "https://via.placeholder.com/400x400?text=Fixed+Mint+NFT"
        }
      };
      const nftMintResult = await mintNftTool.func({
        input: JSON.stringify(nftMintData)
      });
      console.log('📋 NFT Mint Result:', nftMintResult);
    } else {
      console.log('❌ Failed to extract NFT resource address\n');
    }

    console.log('\n======== TEST SUMMARY ========');
    console.log(`🪙 Fungible Token Created: ${fungibleResourceAddress ? '✅ YES' : '❌ NO'}`);
    console.log(`🎨 NFT Collection Created: ${nftResourceAddress ? '✅ YES' : '❌ NO'}`);
    console.log(`🔄 Resource Extraction Fix: ${(fungibleResourceAddress || nftResourceAddress) ? '✅ WORKING' : '❌ STILL BROKEN'}`);

    console.log(`\n🔗 Check Results: https://stokenet-dashboard.radixdlt.com/account/${wallet.getAddress()}`);

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
  }

  process.exit(0);
}

main().catch(error => {
  console.error('💥 Unhandled Error:', error);
  process.exit(1);
}); 