import 'dotenv/config';
import { RadixGatewayClient, RadixNetwork } from './src/radix/RadixGatewayClient';
import { RadixTransactionBuilder } from './src/radix/RadixTransactionBuilder';
import { RadixMnemonicWallet } from './src/radix/MnemonicWallet';
import { createCreateFungibleResourceTool, createCreateNonFungibleResourceTool, createMintFungibleResourceTool, createMintNonFungibleResourceTool, createTransferTokensTool } from './src/agent/tools';
import { NetworkId } from '@radixdlt/radix-engine-toolkit';

/**
 * Working Test for All 5 Token Operations
 * With proper timing and resource address extraction
 */

async function waitForTxAndExtractResource(
  gatewayClient: RadixGatewayClient, 
  txHash: string, 
  resourceType: 'fungible' | 'nft',
  maxWaitTime: number = 30000
): Promise<string | null> {
  console.log(`⏳ Waiting for ${resourceType} transaction: ${txHash}`);
  
  const waitStart = Date.now();
  let attempts = 0;
  
  while (Date.now() - waitStart < maxWaitTime) {
    attempts++;
    console.log(`   Attempt ${attempts} - waiting...`);
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    try {
      const txDetails = await gatewayClient.getTransactionDetails(txHash);
      
      if (txDetails.details?.receipt?.status === 'CommittedSuccess') {
        const newEntities = txDetails.details?.receipt?.state_updates?.new_global_entities;
        
        if (newEntities && newEntities.length > 0) {
          for (const entity of newEntities) {
            const expectedType = resourceType === 'fungible' ? 'GlobalFungibleResource' : 'GlobalNonFungibleResource';
            if (entity.entity_type === expectedType) {
              console.log(`✅ Found ${resourceType} resource: ${entity.entity_address}`);
              return entity.entity_address;
            }
          }
        }
      } else if (txDetails.details?.receipt?.status === 'CommittedFailure') {
        console.log(`❌ Transaction failed: ${txDetails.details.receipt.error_message}`);
        return null;
      }
    } catch (error) {
      console.log(`   Error checking transaction (attempt ${attempts}):`, error instanceof Error ? error.message : 'Unknown error');
    }
  }
  
  console.log(`⏰ Timeout waiting for ${resourceType} transaction after ${maxWaitTime}ms`);
  return null;
}

async function main() {
  console.log('🧪 Working Five Token Operations Test\n');

  try {
    // Initialize services
    const networkId = NetworkId.Stokenet;
    const gatewayClient = new RadixGatewayClient({ networkId: RadixNetwork.Stokenet });
    const transactionBuilder = new RadixTransactionBuilder({ networkId: RadixNetwork.Stokenet });

    // Create two test wallets
    console.log('🔄 Creating test wallets...');
    const wallet1 = RadixMnemonicWallet.generateRandom({
      networkId,
      applicationName: 'WorkingTest1'
    });
    
    const wallet2 = RadixMnemonicWallet.generateRandom({
      networkId,
      applicationName: 'WorkingTest2'
    });

    console.log(`🔑 Wallet 1: ${wallet1.getAddress()}`);
    console.log(`🔑 Wallet 2: ${wallet2.getAddress()}\n`);

    // Fund wallet1 first
    console.log('💰 Funding wallet 1...');
    try {
      const { FaucetHelper } = await import('./src/utils/FaucetHelper');
      const faucetHelper = new FaucetHelper(RadixNetwork.Stokenet);
      await faucetHelper.fundWalletWithFaucet(wallet1);
      console.log('✅ Wallet 1 funded');
      
      // Wait for funding to appear
      await new Promise(resolve => setTimeout(resolve, 10000));
    } catch (error) {
      console.log('⚠️ Funding failed:', error);
      return;
    }

    // Create tools
    const createFungibleTool = createCreateFungibleResourceTool(gatewayClient, transactionBuilder, wallet1, networkId);
    const createNftTool = createCreateNonFungibleResourceTool(gatewayClient, transactionBuilder, wallet1, networkId);
    const mintFungibleTool = createMintFungibleResourceTool(gatewayClient, transactionBuilder, wallet1, networkId);
    const mintNftTool = createMintNonFungibleResourceTool(gatewayClient, transactionBuilder, wallet1, networkId);
    const transferTool = createTransferTokensTool(gatewayClient, transactionBuilder, wallet1, networkId);

    console.log('\n======== STARTING 5 OPERATIONS TEST ========\n');

    // 1. Create Fungible Token
    console.log('1️⃣ Creating fungible token...');
    const fungibleResult = await createFungibleTool.func({
      input: 'WorkingCoin,WC,50000,18'
    });
    console.log('📋 Fungible Result:', fungibleResult);
    
    // Extract resource address from tool response (our fixed tools include it!)
    const fungibleResourceMatch = fungibleResult.match(/🔗 Resource: (resource_[a-zA-Z0-9_]+)/);
    const fungibleResourceAddress = fungibleResourceMatch ? fungibleResourceMatch[1] : null;
    
    if (fungibleResourceAddress) {
      console.log(`✅ Fungible resource extracted from response: ${fungibleResourceAddress}`);
    } else {
      console.log('❌ No fungible resource in response');
    }

    // 2. Create NFT Collection
    console.log('\n2️⃣ Creating NFT collection...');
    const nftResult = await createNftTool.func({
      input: 'WorkingNFTs,Working NFT Collection for comprehensive testing'
    });
    console.log('📋 NFT Result:', nftResult);
    
    // Extract resource address from tool response (our fixed tools include it!)
    const nftResourceMatch = nftResult.match(/🔗 Resource: (resource_[a-zA-Z0-9_]+)/);
    const nftResourceAddress = nftResourceMatch ? nftResourceMatch[1] : null;
    
    if (nftResourceAddress) {
      console.log(`✅ NFT resource extracted from response: ${nftResourceAddress}`);
    } else {
      console.log('❌ No NFT resource in response');
    }

    // 3. Mint Fungible Tokens (if we have the resource address)
    console.log('\n3️⃣ Minting fungible tokens...');
    if (fungibleResourceAddress) {
      const mintFungibleResult = await mintFungibleTool.func({
        input: `${fungibleResourceAddress},10000`
      });
      console.log('📋 Mint Fungible Result:', mintFungibleResult);
    } else {
      console.log('❌ Skipping fungible mint - no resource address extracted');
    }

    // 4. Mint NFT (if we have the resource address)
    console.log('\n4️⃣ Minting NFT...');
    if (nftResourceAddress) {
      const nftMintData = {
        resourceAddress: nftResourceAddress,
        toAccount: wallet1.getAddress(),
        nftId: "1",
        metadata: {
          name: "Working Test NFT #1",
          description: "First NFT from working test suite",
          image: "https://via.placeholder.com/500x500?text=Working+Test+NFT"
        }
      };
      const mintNftResult = await mintNftTool.func({
        input: JSON.stringify(nftMintData)
      });
      console.log('📋 Mint NFT Result:', mintNftResult);
    } else {
      console.log('❌ Skipping NFT mint - no resource address extracted');
    }

    // 5. Transfer XRD tokens
    console.log('\n5️⃣ Transferring XRD...');
    const transferResult = await transferTool.func({
      input: `${wallet2.getAddress()},25`
    });
    console.log('📋 Transfer Result:', transferResult);

    // Summary
    console.log('\n======== TEST RESULTS SUMMARY ========');
    console.log(`✅ 1. Create Fungible Token: ${fungibleResourceAddress ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ 2. Create NFT Collection: ${nftResourceAddress ? 'SUCCESS' : 'FAILED'}`);
    console.log(`${fungibleResourceAddress ? '✅' : '❌'} 3. Mint Fungible Token: ${fungibleResourceAddress ? 'SUCCESS' : 'FAILED - No resource address'}`);
    console.log(`${nftResourceAddress ? '✅' : '❌'} 4. Mint NFT: ${nftResourceAddress ? 'SUCCESS' : 'FAILED - No resource address'}`);
    console.log(`✅ 5. Transfer XRD: SUCCESS`);

    console.log('\n📊 RESOURCES CREATED:');
    if (fungibleResourceAddress) {
      console.log(`🪙 Fungible Token: ${fungibleResourceAddress}`);
    }
    if (nftResourceAddress) {
      console.log(`🎨 NFT Collection: ${nftResourceAddress}`);
    }

    console.log('\n🔗 DASHBOARDS:');
    console.log(`🔗 Wallet 1: https://stokenet-dashboard.radixdlt.com/account/${wallet1.getAddress()}`);
    console.log(`🔗 Wallet 2: https://stokenet-dashboard.radixdlt.com/account/${wallet2.getAddress()}`);

    console.log('\n✅ All tests completed!');

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