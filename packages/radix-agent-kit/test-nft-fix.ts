import 'dotenv/config';
import { RadixGatewayClient, RadixNetwork } from './src/radix/RadixGatewayClient';
import { RadixTransactionBuilder } from './src/radix/RadixTransactionBuilder';
import { RadixMnemonicWallet } from './src/radix/MnemonicWallet';
import { createCreateNonFungibleResourceTool, createMintNonFungibleResourceTool } from './src/agent/tools';
import { NetworkId } from '@radixdlt/radix-engine-toolkit';

/**
 * NFT Fix Test: Test the fixed NFT ID format
 */

async function main() {
  console.log('🧪 NFT Fix Test - Testing corrected NFT ID format\n');

  try {
    // Initialize services
    const networkId = NetworkId.Stokenet;
    const gatewayClient = new RadixGatewayClient({ networkId: RadixNetwork.Stokenet });
    const transactionBuilder = new RadixTransactionBuilder({ networkId: RadixNetwork.Stokenet });

    // Create test wallet
    console.log('🔄 Creating test wallet...');
    const wallet = RadixMnemonicWallet.generateRandom({
      networkId,
      applicationName: 'NFTFixTest'
    });

    console.log(`🔑 Test Wallet: ${wallet.getAddress()}\n`);

    // Fund wallet
    console.log('💰 Funding wallet...');
    try {
      const { FaucetHelper } = await import('./src/utils/FaucetHelper');
      const faucetHelper = new FaucetHelper(RadixNetwork.Stokenet);
      await faucetHelper.fundWalletWithFaucet(wallet);
      console.log('✅ Wallet funded');
      
      // Wait for funding
      await new Promise(resolve => setTimeout(resolve, 8000));
    } catch (error) {
      console.log('⚠️ Funding failed:', error);
      return;
    }

    // Create tools
    const createNftTool = createCreateNonFungibleResourceTool(gatewayClient, transactionBuilder, wallet, networkId);
    const mintNftTool = createMintNonFungibleResourceTool(gatewayClient, transactionBuilder, wallet, networkId);

    console.log('======== NFT FIX TEST ========\n');

    // 1. Create NFT Collection
    console.log('1️⃣ Creating NFT collection...');
    const nftResult = await createNftTool.func({
      input: 'FixedNFTs,NFT Collection with fixed ID format for testing'
    });
    console.log('📋 NFT Creation Result:', nftResult);
    
    // Extract resource address
    const nftResourceMatch = nftResult.match(/🔗 Resource: (resource_[a-zA-Z0-9_]+)/);
    const nftResourceAddress = nftResourceMatch ? nftResourceMatch[1] : null;
    
    if (nftResourceAddress) {
      console.log(`✅ NFT resource: ${nftResourceAddress}\n`);
      
      // 2. Test NFT minting with the fix
      console.log('2️⃣ Testing NFT minting with fixed format...');
      const nftMintData = {
        resourceAddress: nftResourceAddress,
        toAccount: wallet.getAddress(),
        nftId: "1",
        metadata: {
          name: "Fixed NFT #1",
          description: "First NFT using corrected ID format",
          image: "https://via.placeholder.com/400x400?text=Fixed+NFT"
        }
      };
      
      const mintResult = await mintNftTool.func({
        input: JSON.stringify(nftMintData)
      });
      console.log('📋 NFT Mint Result:', mintResult);
      
      if (mintResult.includes('✅')) {
        console.log('🎉 NFT MINTING SUCCESS! The fix worked!');
        
        // Test with different NFT ID formats
        console.log('\n3️⃣ Testing multiple NFT formats...');
        
        const testCases = [
          { id: "2", name: "Numeric NFT #2" },
          { id: "3", name: "Numeric NFT #3" },
          { id: "100", name: "Large Number NFT" }
        ];
        
        for (let i = 0; i < testCases.length; i++) {
          const testCase = testCases[i];
          console.log(`   Testing ${testCase.name} (ID: ${testCase.id})...`);
          
          const testMintData = {
            resourceAddress: nftResourceAddress,
            toAccount: wallet.getAddress(),
            nftId: testCase.id,
            metadata: {
              name: testCase.name,
              description: `Test NFT with ID format: ${testCase.id}`,
              image: `https://via.placeholder.com/400x400?text=${testCase.name.replace(' ', '+')}`
            }
          };
          
          const testResult = await mintNftTool.func({
            input: JSON.stringify(testMintData)
          });
          
          if (testResult.includes('✅')) {
            console.log(`   ✅ ${testCase.name} minted successfully`);
          } else {
            console.log(`   ❌ ${testCase.name} failed:`, testResult);
          }
        }
      } else {
        console.log('❌ NFT minting still failed:', mintResult);
      }
    } else {
      console.log('❌ No NFT resource address found');
    }

    console.log('\n======== TEST COMPLETE ========');
    console.log(`🔗 Check NFTs: https://stokenet-dashboard.radixdlt.com/account/${wallet.getAddress()}/nfts`);

  } catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : String(error));
  }

  process.exit(0);
}

main().catch(console.error); 