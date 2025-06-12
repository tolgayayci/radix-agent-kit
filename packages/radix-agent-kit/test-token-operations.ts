import 'dotenv/config';
import { RadixAgent, RadixNetwork } from './src/index';

/**
 * Local Test Script for 5-Operation Token Test
 * 1. Create Fungible Token
 * 2. Create Non-Fungible Token Collection  
 * 3. Mint Fungible Token (using real resource address)
 * 4. Mint Non-Fungible Token (using real collection address)
 * 5. Transfer Tokens (between 2 wallets)
 */

function extractResourceFromResponse(response: string): string | null {
  // Try multiple patterns to extract resource address
  let match = response.match(/🔗 Resource: (resource_[a-zA-Z0-9_]+)/);
  if (!match) {
    match = response.match(/Resource: (resource_[a-zA-Z0-9_]+)/);
  }
  if (!match) {
    match = response.match(/(resource_[a-zA-Z0-9_]+)/);
  }
  return match ? match[1] : null;
}

function extractTxHash(response: string): string | null {
  const match = response.match(/(txid_[a-zA-Z0-9_]+)/);
  return match ? match[1] : null;
}

// Helper function to wait and check transaction status
async function waitForTransactionAndExtractResource(
  agent: RadixAgent, 
  txHash: string, 
  resourceType: 'fungible' | 'nft'
): Promise<string | null> {
  console.log(`⏳ Waiting for transaction ${txHash} to confirm...`);
  
  // Wait longer for transaction to be confirmed
  await new Promise(resolve => setTimeout(resolve, 15000));
  
  try {
    const result = await agent.run(`Get the resource address created by transaction ${txHash}`);
    console.log(`📋 Transaction query result: ${result}`);
    
    const resourceAddress = extractResourceFromResponse(result);
    if (resourceAddress) {
      console.log(`✅ Found ${resourceType} resource: ${resourceAddress}`);
      return resourceAddress;
    }
    
    // Alternative: try getting account info to see new resources
    const accountInfo = await agent.run('What resources do I own? Show all my tokens and NFTs');
    console.log(`📋 Account info: ${accountInfo}`);
    
    return extractResourceFromResponse(accountInfo);
  } catch (error) {
    console.error(`❌ Error checking transaction: ${error}`);
    return null;
  }
}

async function main() {
  console.log('🧪 Local Token Operations Test\n');

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Missing OPENAI_API_KEY environment variable');
    process.exit(1);
  }

  try {
    // Create first agent/wallet
    console.log('🔄 Creating Agent 1...');
    const agent1 = new RadixAgent({
      networkId: RadixNetwork.Stokenet,
      openaiApiKey: process.env.OPENAI_API_KEY,
      applicationName: 'LocalTokenTest1',
      verbose: true
    });

    await agent1.initialize();
    const wallet1 = agent1.getWallet();
    console.log(`🔑 Wallet 1: ${wallet1?.getAddress()}`);

    // Create second agent/wallet for transfers
    console.log('🔄 Creating Agent 2...');
    const agent2 = new RadixAgent({
      networkId: RadixNetwork.Stokenet,
      openaiApiKey: process.env.OPENAI_API_KEY,
      applicationName: 'LocalTokenTest2',
      verbose: true
    });

    await agent2.initialize();
    const wallet2 = agent2.getWallet();
    console.log(`🔑 Wallet 2: ${wallet2?.getAddress()}`);
    console.log(`🔗 Dashboard 1: https://stokenet-dashboard.radixdlt.com/account/${wallet1?.getAddress()}`);
    console.log(`🔗 Dashboard 2: https://stokenet-dashboard.radixdlt.com/account/${wallet2?.getAddress()}\n`);

    // Fund both wallets
    console.log('💰 Funding wallets...');
    await agent1.run('Fund my wallet with testnet XRD');
    await agent2.run('Fund my wallet with testnet XRD');
    console.log('✅ Both wallets funded\n');

    // Check initial balances
    const balance1 = await agent1.run('What is my XRD balance?');
    console.log(`💰 Wallet 1 initial balance: ${balance1}\n`);

    // 1. Create Fungible Token
    console.log('1️⃣ Creating fungible token...');
    const result1 = await agent1.run('Create a fungible token called LocalTestCoin with symbol LTC and 500000 initial supply');
    console.log(`📋 Response: ${result1}\n`);
    
    const fungibleTxHash = extractTxHash(result1);
    console.log(`📝 Transaction hash: ${fungibleTxHash}`);
    
    // Wait and extract fungible resource address
    const fungibleResourceAddress = await waitForTransactionAndExtractResource(agent1, fungibleTxHash!, 'fungible');
    console.log(`🪙 Extracted fungible resource: ${fungibleResourceAddress}\n`);

    // 2. Create Non-Fungible Token Collection
    console.log('2️⃣ Creating NFT collection...');
    const result2 = await agent1.run('Create an NFT collection called LocalTestNFTs with description "Local Test NFT Collection for agent testing"');
    console.log(`📋 Response: ${result2}\n`);
    
    const nftTxHash = extractTxHash(result2);
    console.log(`📝 Transaction hash: ${nftTxHash}`);
    
    // Wait and extract NFT resource address
    const nftResourceAddress = await waitForTransactionAndExtractResource(agent1, nftTxHash!, 'nft');
    console.log(`🎨 Extracted NFT resource: ${nftResourceAddress}\n`);

    // 3. Mint Fungible Token (using correct format: resourceAddress,amount)
    console.log('3️⃣ Minting fungible tokens...');
    if (fungibleResourceAddress) {
      const result3 = await agent1.run(`Mint additional tokens: ${fungibleResourceAddress},2000`);
      console.log(`📋 Response: ${result3}\n`);
    } else {
      console.log('❌ Could not extract fungible resource address for minting\n');
    }

    // 4. Mint Non-Fungible Token (using correct JSON format)
    console.log('4️⃣ Minting NFT...');
    if (nftResourceAddress && wallet1) {
      const nftData = {
        resourceAddress: nftResourceAddress,
        toAccount: wallet1.getAddress(),
        nftId: "001",
        metadata: {
          name: "Local Test NFT #1",
          description: "First test NFT from local testing",
          image: "https://via.placeholder.com/300x300?text=Local+Test+NFT"
        }
      };
      const result4 = await agent1.run(`Mint a new NFT with this data: ${JSON.stringify(nftData)}`);
      console.log(`📋 Response: ${result4}\n`);
    } else {
      console.log('❌ Could not extract NFT collection address for minting\n');
    }

    // 5. Transfer Tokens (using correct format: toAddress,amount)
    console.log('5️⃣ Transferring XRD tokens...');
    const wallet2Address = wallet2?.getAddress();
    const result5 = await agent1.run(`Transfer tokens to: ${wallet2Address},150`);
    console.log(`📋 Response: ${result5}\n`);

    // Check final balances
    console.log('🔍 Checking final balances...');
    const finalBalance1 = await agent1.run('What are all my token balances? Show XRD and any custom tokens');
    const finalBalance2 = await agent2.run('What are all my token balances? Show XRD and any custom tokens');
    console.log(`💰 Wallet 1 final balance: ${finalBalance1}`);
    console.log(`💰 Wallet 2 final balance: ${finalBalance2}\n`);

    // 6. Optional: Transfer custom tokens if minting worked
    if (fungibleResourceAddress) {
      console.log('6️⃣ Transferring custom tokens...');
      const result6 = await agent1.run(`Transfer 100 tokens of resource ${fungibleResourceAddress} to ${wallet2Address}`);
      console.log(`📋 Response: ${result6}\n`);
    }

    console.log('✅ All operations completed!');
    console.log(`🔗 Wallet 1: https://stokenet-dashboard.radixdlt.com/account/${wallet1?.getAddress()}`);
    console.log(`🔗 Wallet 2: https://stokenet-dashboard.radixdlt.com/account/${wallet2?.getAddress()}`);

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