import 'dotenv/config';
import { RadixGatewayClient, RadixNetwork } from './src/radix/RadixGatewayClient';
import { RadixTransactionBuilder } from './src/radix/RadixTransactionBuilder';
import { RadixMnemonicWallet } from './src/radix/MnemonicWallet';
import { createCreateFungibleResourceTool, createCreateNonFungibleResourceTool, createMintFungibleResourceTool, createMintNonFungibleResourceTool, createTransferTokensTool } from './src/agent/tools';
import { NetworkId } from '@radixdlt/radix-engine-toolkit';

/**
 * Test all 5 operations locally:
 * 1. Create Fungible Token
 * 2. Create NFT Collection  
 * 3. Mint Fungible Token
 * 4. Mint NFT
 * 5. Transfer Tokens
 */

function extractResourceAddress(response: string): string | null {
  // Extract resource address from tool response
  const match = response.match(/🔗 Resource: (resource_[a-zA-Z0-9_]+)|Resource: (resource_[a-zA-Z0-9_]+)|(resource_[a-zA-Z0-9_]+)/);
  return match ? (match[1] || match[2] || match[3]) : null;
}

function extractTxHash(response: string): string | null {
  // Extract transaction hash from tool response
  const match = response.match(/(txid_[a-zA-Z0-9_]+)/);
  return match ? match[1] : null;
}

async function main() {
  console.log('🧪 Five Token Operations Test\n');

  try {
    // Initialize services with correct types
    const networkId = NetworkId.Stokenet;
    const gatewayClient = new RadixGatewayClient({ networkId: RadixNetwork.Stokenet });
    const transactionBuilder = new RadixTransactionBuilder({ networkId: RadixNetwork.Stokenet });

    // Create two test wallets
    console.log('🔄 Creating test wallets...');
    const wallet1 = RadixMnemonicWallet.generateRandom({
      networkId,
      applicationName: 'FiveOpsTest1'
    });
    
    const wallet2 = RadixMnemonicWallet.generateRandom({
      networkId,
      applicationName: 'FiveOpsTest2'
    });

    console.log(`🔑 Wallet 1: ${wallet1.getAddress()}`);
    console.log(`🔑 Wallet 2: ${wallet2.getAddress()}\n`);

    // Create tools
    const createFungibleTool = createCreateFungibleResourceTool(gatewayClient, transactionBuilder, wallet1, networkId);
    const createNftTool = createCreateNonFungibleResourceTool(gatewayClient, transactionBuilder, wallet1, networkId);
    const mintFungibleTool = createMintFungibleResourceTool(gatewayClient, transactionBuilder, wallet1, networkId);
    const mintNftTool = createMintNonFungibleResourceTool(gatewayClient, transactionBuilder, wallet1, networkId);
    const transferTool = createTransferTokensTool(gatewayClient, transactionBuilder, wallet1, networkId);

    // Fund wallet1 (we'll use the faucet helper)
    console.log('💰 Attempting to fund wallet 1...');
    try {
      const { FaucetHelper } = await import('./src/utils/FaucetHelper');
      const faucetHelper = new FaucetHelper(RadixNetwork.Stokenet);
      await faucetHelper.fundWalletWithFaucet(wallet1);
      console.log('✅ Wallet 1 funded');
      
      // Wait for funding
      await new Promise(resolve => setTimeout(resolve, 8000));
    } catch (error) {
      console.log('⚠️ Funding failed, continuing anyway...');
    }

    // 1. Create Fungible Token
    console.log('\n1️⃣ Creating fungible token...');
    const fungibleResult = await createFungibleTool.func({
      input: 'TestCoin,TC,100000,18'
    });
    console.log('📋 Result:', fungibleResult);
    
    const fungibleTxHash = extractTxHash(fungibleResult);
    let fungibleResourceAddress: string | null = null;
    
    if (fungibleTxHash) {
      console.log('⏳ Waiting for fungible token transaction...');
      await new Promise(resolve => setTimeout(resolve, 12000));
      
      try {
        const txDetails = await gatewayClient.getTransactionDetails(fungibleTxHash);
        const newEntities = txDetails.details?.receipt?.state_updates?.new_global_entities;
        if (newEntities) {
          for (const entity of newEntities) {
            if (entity.entity_type === 'GlobalFungibleResource') {
              fungibleResourceAddress = entity.entity_address;
              console.log('🪙 Fungible Resource:', fungibleResourceAddress);
              break;
            }
          }
        }
      } catch (error) {
        console.log('⚠️ Could not extract fungible resource address');
      }
    }

    // 2. Create NFT Collection
    console.log('\n2️⃣ Creating NFT collection...');
    const nftResult = await createNftTool.func({
      input: 'TestNFTs,Test NFT Collection for local testing'
    });
    console.log('📋 Result:', nftResult);
    
    const nftTxHash = extractTxHash(nftResult);
    let nftResourceAddress: string | null = null;
    
    if (nftTxHash) {
      console.log('⏳ Waiting for NFT collection transaction...');
      await new Promise(resolve => setTimeout(resolve, 12000));
      
      try {
        const txDetails = await gatewayClient.getTransactionDetails(nftTxHash);
        const newEntities = txDetails.details?.receipt?.state_updates?.new_global_entities;
        if (newEntities) {
          for (const entity of newEntities) {
            if (entity.entity_type === 'GlobalNonFungibleResource') {
              nftResourceAddress = entity.entity_address;
              console.log('🎨 NFT Resource:', nftResourceAddress);
              break;
            }
          }
        }
      } catch (error) {
        console.log('⚠️ Could not extract NFT resource address');
      }
    }

    // 3. Mint Fungible Tokens (if we have the resource address)
    if (fungibleResourceAddress) {
      console.log('\n3️⃣ Minting fungible tokens...');
      const mintFungibleResult = await mintFungibleTool.func({
        input: `${fungibleResourceAddress},5000`
      });
      console.log('📋 Result:', mintFungibleResult);
    } else {
      console.log('\n3️⃣ ❌ Skipping fungible mint - no resource address');
    }

    // 4. Mint NFT (if we have the resource address)
    if (nftResourceAddress) {
      console.log('\n4️⃣ Minting NFT...');
      const nftMintData = {
        resourceAddress: nftResourceAddress,
        toAccount: wallet1.getAddress(),
        nftId: "001",
        metadata: {
          name: "Local Test NFT #1",
          description: "First NFT from local test",
          image: "https://via.placeholder.com/300x300?text=Local+Test+NFT"
        }
      };
      const mintNftResult = await mintNftTool.func({
        input: JSON.stringify(nftMintData)
      });
      console.log('📋 Result:', mintNftResult);
    } else {
      console.log('\n4️⃣ ❌ Skipping NFT mint - no resource address');
    }

    // 5. Transfer XRD tokens
    console.log('\n5️⃣ Transferring XRD...');
    const transferResult = await transferTool.func({
      input: `${wallet2.getAddress()},50`
    });
    console.log('📋 Result:', transferResult);

    console.log('\n✅ Five operations test completed!');
    console.log(`🔗 Check Wallet 1: https://stokenet-dashboard.radixdlt.com/account/${wallet1.getAddress()}`);
    console.log(`🔗 Check Wallet 2: https://stokenet-dashboard.radixdlt.com/account/${wallet2.getAddress()}`);

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
  }

  process.exit(0);
}

main().catch(error => {
  console.error('💥 Error:', error);
  process.exit(1);
}); 