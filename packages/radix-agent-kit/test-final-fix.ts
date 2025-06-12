import 'dotenv/config';
import { RadixGatewayClient, RadixNetwork } from './src/radix/RadixGatewayClient';
import { RadixTransactionBuilder } from './src/radix/RadixTransactionBuilder';
import { RadixMnemonicWallet } from './src/radix/MnemonicWallet';
import { createCreateFungibleResourceTool, createCreateNonFungibleResourceTool, createMintFungibleResourceTool, createMintNonFungibleResourceTool } from './src/agent/tools';
import { NetworkId } from '@radixdlt/radix-engine-toolkit';

/**
 * Final Test: Improved Async Resource Extraction
 * Tests the fixed resource extraction using proper Gateway API polling
 */

async function main() {
  console.log('🧪 Final Test: Improved Resource Extraction\n');

  try {
    // Initialize services
    const networkId = NetworkId.Stokenet;
    const gatewayClient = new RadixGatewayClient({ networkId: RadixNetwork.Stokenet });
    const transactionBuilder = new RadixTransactionBuilder({ networkId: RadixNetwork.Stokenet });

    // Create test wallet
    console.log('🔄 Creating test wallet...');
    const wallet = RadixMnemonicWallet.generateRandom({
      networkId,
      applicationName: 'FinalFixTest'
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

    console.log('======== TESTING IMPROVED ASYNC EXTRACTION ========\n');

    // 1. Create Fungible Token with improved extraction
    console.log('1️⃣ Creating fungible token with improved async extraction...');
    const fungibleResult = await createFungibleTool.func({
      input: 'AsyncCoin,AC,25000,18'
    });
    console.log('📋 Fungible Result:', fungibleResult);
    
    // Check if resource address is in the response
    const fungibleResourceMatch = fungibleResult.match(/🔗 Resource: (resource_[a-zA-Z0-9_]+)/);
    const fungibleResourceAddress = fungibleResourceMatch ? fungibleResourceMatch[1] : null;
    
    if (fungibleResourceAddress) {
      console.log(`✅ FUNGIBLE SUCCESS: ${fungibleResourceAddress}\n`);
      
      // Test minting immediately
      console.log('3️⃣ Testing fungible token minting...');
      const mintResult = await mintFungibleTool.func({
        input: `${fungibleResourceAddress},7500`
      });
      console.log('📋 Mint Result:', mintResult);
      
      if (mintResult.includes('✅')) {
        console.log('✅ FUNGIBLE MINT SUCCESS!\n');
      } else {
        console.log('❌ FUNGIBLE MINT FAILED\n');
      }
    } else {
      console.log('❌ FUNGIBLE EXTRACTION FAILED\n');
    }

    // 2. Create NFT Collection with improved extraction
    console.log('2️⃣ Creating NFT collection with improved async extraction...');
    const nftResult = await createNftTool.func({
      input: 'AsyncNFTs,Async NFT Collection for testing improved resource extraction'
    });
    console.log('📋 NFT Result:', nftResult);
    
    // Check if resource address is in the response
    const nftResourceMatch = nftResult.match(/🔗 Resource: (resource_[a-zA-Z0-9_]+)/);
    const nftResourceAddress = nftResourceMatch ? nftResourceMatch[1] : null;
    
    if (nftResourceAddress) {
      console.log(`✅ NFT SUCCESS: ${nftResourceAddress}\n`);
      
      // Test NFT minting immediately
      console.log('4️⃣ Testing NFT minting...');
      const nftMintData = {
        resourceAddress: nftResourceAddress,
        toAccount: wallet.getAddress(),
        nftId: "async001",
        metadata: {
          name: "Async Test NFT #1",
          description: "First NFT using improved async extraction",
          image: "https://via.placeholder.com/300x300?text=Async+NFT"
        }
      };
      const nftMintResult = await mintNftTool.func({
        input: JSON.stringify(nftMintData)
      });
      console.log('📋 NFT Mint Result:', nftMintResult);
      
      if (nftMintResult.includes('✅')) {
        console.log('✅ NFT MINT SUCCESS!\n');
      } else {
        console.log('❌ NFT MINT FAILED\n');
      }
    } else {
      console.log('❌ NFT EXTRACTION FAILED\n');
    }

    console.log('======== FINAL RESULTS ========');
    console.log(`🪙 Fungible Token: ${fungibleResourceAddress ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`🎨 NFT Collection: ${nftResourceAddress ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`🔗 Wallet Dashboard: https://stokenet-dashboard.radixdlt.com/account/${wallet.getAddress()}`);

  } catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : String(error));
  }

  process.exit(0);
}

main().catch(console.error); 