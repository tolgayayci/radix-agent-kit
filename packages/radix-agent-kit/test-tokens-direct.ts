import 'dotenv/config';
import { RadixGatewayClient, RadixNetwork } from './src/radix/RadixGatewayClient';
import { RadixTransactionBuilder } from './src/radix/RadixTransactionBuilder';
import { RadixMnemonicWallet } from './src/radix/MnemonicWallet';
import { Token } from './src/radix/Token';
import { FaucetHelper } from './src/utils/FaucetHelper';
import { createCreateFungibleResourceTool, createCreateNonFungibleResourceTool, createMintFungibleResourceTool, createMintNonFungibleResourceTool } from './src/agent/tools';
import { NetworkId } from '@radixdlt/radix-engine-toolkit';

/**
 * Direct Local Test - No OpenAI
 * Tests token creation and minting directly using the tools
 */

async function main() {
  console.log('🧪 Direct Token Test (No OpenAI)\n');

  try {
    // Initialize services
    const networkId = NetworkId.Stokenet;
    const gatewayClient = new RadixGatewayClient({ networkId: RadixNetwork.Stokenet });
    const transactionBuilder = new RadixTransactionBuilder({ networkId });

    // Create test wallets
    console.log('🔄 Creating test wallets...');
    const wallet1 = RadixMnemonicWallet.generateRandom({
      networkId,
      applicationName: 'DirectTokenTest1'
    });
    
    const wallet2 = RadixMnemonicWallet.generateRandom({
      networkId,
      applicationName: 'DirectTokenTest2'
    });

    console.log(`🔑 Wallet 1: ${wallet1.getAddress()}`);
    console.log(`🔑 Wallet 2: ${wallet2.getAddress()}`);
    console.log(`🔗 Dashboard 1: https://stokenet-dashboard.radixdlt.com/account/${wallet1.getAddress()}`);
    console.log(`🔗 Dashboard 2: https://stokenet-dashboard.radixdlt.com/account/${wallet2.getAddress()}\n`);

    // Fund wallets
    console.log('💰 Funding wallets...');
    const faucetHelper = new FaucetHelper(RadixNetwork.Stokenet);
    
    try {
      await faucetHelper.fundWalletWithFaucet(wallet1);
      console.log('✅ Wallet 1 funded');
    } catch (error) {
      console.log('⚠️ Wallet 1 funding failed, continuing...');
    }

    try {
      await faucetHelper.fundWalletWithFaucet(wallet2);
      console.log('✅ Wallet 2 funded');
    } catch (error) {
      console.log('⚠️ Wallet 2 funding failed, continuing...');
    }

    // Wait for funding
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Check balances
    console.log('\n💰 Checking initial balances...');
    try {
      const balance1 = await gatewayClient.getAccountBalances(wallet1.getAddress());
      console.log('Wallet 1 balance response:', JSON.stringify(balance1, null, 2));
    } catch (error) {
      console.log('Could not get balance for wallet 1:', error);
    }

    // Create tools
    const createFungibleTool = createCreateFungibleResourceTool(gatewayClient, transactionBuilder, wallet1, networkId);
    const createNftTool = createCreateNonFungibleResourceTool(gatewayClient, transactionBuilder, wallet1, networkId);
    const mintFungibleTool = createMintFungibleResourceTool(gatewayClient, transactionBuilder, wallet1, networkId);
    const mintNftTool = createMintNonFungibleResourceTool(gatewayClient, transactionBuilder, wallet1, networkId);

    // 1. Create Fungible Token
    console.log('\n1️⃣ Creating fungible token...');
    const fungibleResult = await createFungibleTool.func({
      input: 'DirectTestCoin,DTC,100000'
    });
    console.log('📋 Fungible token result:', fungibleResult);

    // Extract transaction hash and wait
    const fungibleTxMatch = fungibleResult.match(/(txid_[a-zA-Z0-9_]+)/);
    const fungibleTxHash = fungibleTxMatch ? fungibleTxMatch[1] : null;
    console.log('📝 Fungible TX Hash:', fungibleTxHash);

    if (fungibleTxHash) {
      console.log('⏳ Waiting for fungible token transaction...');
      await new Promise(resolve => setTimeout(resolve, 15000));

      // Try to extract resource address
      try {
        const txDetails = await gatewayClient.getTransactionDetails(fungibleTxHash);
        console.log('📋 Fungible TX Details:', JSON.stringify(txDetails, null, 2));
        
        const newEntities = txDetails.details?.receipt?.state_updates?.new_global_entities;
        if (newEntities && newEntities.length > 0) {
          for (const entity of newEntities) {
            if (entity.entity_type === 'GlobalFungibleResource') {
              console.log('🪙 Found fungible resource:', entity.entity_address);
              
              // 3. Test minting with this resource
              console.log('\n3️⃣ Testing fungible token minting...');
              const mintResult = await mintFungibleTool.func({
                input: `${entity.entity_address},5000`
              });
              console.log('📋 Mint result:', mintResult);
              break;
            }
          }
        }
      } catch (error) {
        console.log('❌ Error getting fungible transaction details:', error);
      }
    }

    // 2. Create NFT Collection
    console.log('\n2️⃣ Creating NFT collection...');
    const nftResult = await createNftTool.func({
      input: 'DirectTestNFTs,Direct Test NFT Collection for debugging'
    });
    console.log('📋 NFT collection result:', nftResult);

    // Extract transaction hash and wait
    const nftTxMatch = nftResult.match(/(txid_[a-zA-Z0-9_]+)/);
    const nftTxHash = nftTxMatch ? nftTxMatch[1] : null;
    console.log('📝 NFT TX Hash:', nftTxHash);

    if (nftTxHash) {
      console.log('⏳ Waiting for NFT collection transaction...');
      await new Promise(resolve => setTimeout(resolve, 15000));

      // Try to extract resource address
      try {
        const txDetails = await gatewayClient.getTransactionDetails(nftTxHash);
        console.log('📋 NFT TX Details:', JSON.stringify(txDetails, null, 2));
        
        const newEntities = txDetails.details?.receipt?.state_updates?.new_global_entities;
        if (newEntities && newEntities.length > 0) {
          for (const entity of newEntities) {
            if (entity.entity_type === 'GlobalNonFungibleResource') {
              console.log('🎨 Found NFT resource:', entity.entity_address);
              
              // 4. Test minting with this resource
              console.log('\n4️⃣ Testing NFT minting...');
              const nftMintData = {
                resourceAddress: entity.entity_address,
                toAccount: wallet1.getAddress(),
                nftId: "001",
                metadata: {
                  name: "Direct Test NFT #1",
                  description: "First direct test NFT",
                  image: "https://via.placeholder.com/400x400?text=Direct+Test+NFT"
                }
              };
              const nftMintResult = await mintNftTool.func({
                input: JSON.stringify(nftMintData)
              });
              console.log('📋 NFT mint result:', nftMintResult);
              break;
            }
          }
        }
      } catch (error) {
        console.log('❌ Error getting NFT transaction details:', error);
      }
    }

    console.log('\n✅ Direct test completed!');
    console.log(`🔗 Check Wallet 1: https://stokenet-dashboard.radixdlt.com/account/${wallet1.getAddress()}`);
    console.log(`🔗 Check Wallet 2: https://stokenet-dashboard.radixdlt.com/account/${wallet2.getAddress()}`);

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace available');
  }

  process.exit(0);
}

main().catch(error => {
  console.error('💥 Error:', error);
  process.exit(1);
}); 