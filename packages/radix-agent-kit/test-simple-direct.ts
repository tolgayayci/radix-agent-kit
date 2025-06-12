import 'dotenv/config';
import { RadixAgent, RadixNetwork } from './src/index';

/**
 * Simple Direct Test - Test core functionality without complex AI interactions
 * 1. Create 2 wallets with addresses
 * 2. Fund them
 * 3. Create fungible token
 * 4. Create NFT collection
 * 5. Try to mint fungible token
 * 6. Try to mint NFT
 */

async function main() {
  console.log('🧪 Simple Direct Token Test\n');

  try {
    // Create agents (but we'll use them for wallet management, not AI)
    console.log('🔄 Creating test agents...');
    
    const agent1 = new RadixAgent({
      networkId: RadixNetwork.Stokenet,
      applicationName: 'SimpleDirectTest1',
      // Don't pass OpenAI key to avoid LLM usage
      verbose: true
    });

    await agent1.initialize();
    const wallet1 = agent1.getWallet();
    
    const agent2 = new RadixAgent({
      networkId: RadixNetwork.Stokenet,
      applicationName: 'SimpleDirectTest2',
      verbose: true
    });

    await agent2.initialize();
    const wallet2 = agent2.getWallet();

    console.log(`\n🔑 Wallet 1: ${wallet1?.getAddress()}`);
    console.log(`🔑 Wallet 2: ${wallet2?.getAddress()}`);
    console.log(`🔗 Dashboard 1: https://stokenet-dashboard.radixdlt.com/account/${wallet1?.getAddress()}`);
    console.log(`🔗 Dashboard 2: https://stokenet-dashboard.radixdlt.com/account/${wallet2?.getAddress()}\n`);

    // Fund wallets (may fail gracefully)
    console.log('💰 Attempting to fund wallets...');
    try {
      const result1 = await agent1.run('Fund my wallet with testnet XRD');
      console.log('📋 Wallet 1 funding result:', result1);
    } catch (error) {
      console.log('⚠️ Wallet 1 funding failed, continuing...');
    }

    try {
      const result2 = await agent2.run('Fund my wallet with testnet XRD');
      console.log('📋 Wallet 2 funding result:', result2);
    } catch (error) {
      console.log('⚠️ Wallet 2 funding failed, continuing...');
    }

    // Wait for funding
    await new Promise(resolve => setTimeout(resolve, 8000));

    // Check balances
    console.log('\n💰 Checking balances...');
    try {
      const balance1 = await agent1.run('What is my XRD balance?');
      console.log('💰 Wallet 1 balance:', balance1);
    } catch (error) {
      console.log('⚠️ Could not get wallet 1 balance');
    }

    // 1. Create Fungible Token
    console.log('\n1️⃣ Creating fungible token...');
    try {
      const fungibleResult = await agent1.run('Create a fungible token called SimpleTestCoin with symbol STC and 50000 initial supply');
      console.log('📋 Fungible token result:', fungibleResult);
      
      // Extract transaction hash if present
      const txMatch = fungibleResult.match(/(txid_[a-zA-Z0-9_]+)/);
      if (txMatch) {
        console.log('📝 Fungible Token TX:', txMatch[1]);
        
        // Wait and check if resource address is in response
        await new Promise(resolve => setTimeout(resolve, 12000));
        
        // Try to get account info to see new resources
        try {
          const accountInfo = await agent1.run('What resources do I own? Show all my tokens');
          console.log('📋 Updated account resources:', accountInfo);
        } catch (error) {
          console.log('⚠️ Could not get updated account info');
        }
      }
    } catch (error) {
      console.log('❌ Fungible token creation failed:', error);
    }

    // 2. Create NFT Collection
    console.log('\n2️⃣ Creating NFT collection...');
    try {
      const nftResult = await agent1.run('Create an NFT collection called SimpleTestNFTs with description "Simple test NFT collection"');
      console.log('📋 NFT collection result:', nftResult);
      
      // Extract transaction hash if present
      const txMatch = nftResult.match(/(txid_[a-zA-Z0-9_]+)/);
      if (txMatch) {
        console.log('📝 NFT Collection TX:', txMatch[1]);
        
        // Wait and check if resource address is in response
        await new Promise(resolve => setTimeout(resolve, 12000));
        
        // Try to get account info to see new resources
        try {
          const accountInfo = await agent1.run('What NFT collections do I own?');
          console.log('📋 Updated NFT collections:', accountInfo);
        } catch (error) {
          console.log('⚠️ Could not get updated NFT info');
        }
      }
    } catch (error) {
      console.log('❌ NFT collection creation failed:', error);
    }

    // 3. Try to mint using specific resource addresses if we can extract them
    console.log('\n3️⃣ Testing resource-based operations...');
    
    // Try to get a list of owned resources to extract addresses for minting
    try {
      const resourceList = await agent1.run('List all my custom tokens and NFT collections with their resource addresses');
      console.log('📋 Resource list:', resourceList);
      
      // Look for resource addresses in the response
      const resourceMatches = resourceList.match(/resource_[a-zA-Z0-9_]+/g);
      if (resourceMatches && resourceMatches.length > 0) {
        console.log('🔍 Found resources:', resourceMatches);
        
        // Try minting if we found resources
        for (const resourceAddress of resourceMatches) {
          console.log(`\n🎯 Testing with resource: ${resourceAddress}`);
          
          // Try fungible mint first
          try {
            const mintResult = await agent1.run(`Mint 1000 additional tokens for resource ${resourceAddress}`);
            console.log('📋 Mint attempt result:', mintResult);
          } catch (error) {
            console.log('⚠️ Mint attempt failed for', resourceAddress);
          }
          
          // Try NFT mint if it seems like an NFT resource
          try {
            const nftMintData = {
              resourceAddress: resourceAddress,
              toAccount: wallet1?.getAddress(),
              nftId: "001",
              metadata: {
                name: "Simple Test NFT #1",
                description: "Test NFT from simple direct test"
              }
            };
            const nftMintResult = await agent1.run(`Mint a new NFT with data: ${JSON.stringify(nftMintData)}`);
            console.log('📋 NFT mint attempt result:', nftMintResult);
          } catch (error) {
            console.log('⚠️ NFT mint attempt failed for', resourceAddress);
          }
        }
      }
    } catch (error) {
      console.log('⚠️ Could not get resource list:', error);
    }

    // 4. Transfer test
    console.log('\n4️⃣ Testing transfers...');
    try {
      const transferResult = await agent1.run(`Transfer 50 XRD to ${wallet2?.getAddress()}`);
      console.log('📋 Transfer result:', transferResult);
    } catch (error) {
      console.log('❌ Transfer failed:', error);
    }

    console.log('\n✅ Simple direct test completed!');
    console.log(`🔗 Check Wallet 1: https://stokenet-dashboard.radixdlt.com/account/${wallet1?.getAddress()}`);
    console.log(`🔗 Check Wallet 2: https://stokenet-dashboard.radixdlt.com/account/${wallet2?.getAddress()}`);

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
  }

  process.exit(0);
}

main().catch(error => {
  console.error('💥 Error:', error);
  process.exit(1);
}); 