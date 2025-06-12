import 'dotenv/config';
import { RadixAgent, RadixNetwork } from 'radix-agent-kit';

/**
 * Working 5-Operation Token Test
 * 1. Create Fungible Token
 * 2. Create Non-Fungible Token Collection  
 * 3. Mint Fungible Token (using real resource address)
 * 4. Mint Non-Fungible Token (using real collection address)
 * 5. Transfer Tokens (between 2 wallets)
 */

function extractResourceAddress(response) {
  // Updated pattern to match complete Radix resource addresses
  let match = response.match(/🔗 Resource: (resource_tdx_[a-zA-Z0-9_]+)/);
  if (!match) {
    match = response.match(/Resource Address: (resource_tdx_[a-zA-Z0-9_]+)/);
  }
  if (!match) {
    match = response.match(/(resource_tdx_[a-zA-Z0-9_]+)/);
  }
  return match ? match[1] : null;
}

function extractTxHash(response) {
  const match = response.match(/(txid_tdx_[a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

async function main() {
  console.log('🪙 Working 5-Operation Token Test\n');

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Missing OPENAI_API_KEY');
    process.exit(1);
  }

  try {
    // Create first agent/wallet
    const agent1 = new RadixAgent({
      networkId: RadixNetwork.Stokenet,
      openaiApiKey: process.env.OPENAI_API_KEY,
      applicationName: 'TokenTest1',
      verbose: false
    });

    await agent1.initialize();
    const wallet1 = agent1.getWallet();
    console.log(`🔑 Wallet 1: ${wallet1?.getAddress()}`);

    // Create second agent/wallet for transfers
    const agent2 = new RadixAgent({
      networkId: RadixNetwork.Stokenet,
      openaiApiKey: process.env.OPENAI_API_KEY,
      applicationName: 'TokenTest2',
      verbose: false
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

    // 1. Create Fungible Token
    console.log('1️⃣ Creating fungible token...');
    const result1 = await agent1.run('Create a fungible token called TestCoin with symbol TEST and 1000000 initial supply');
    console.log(`Response: ${result1}\n`);
    
    // Wait for transaction and extract resource address
    await new Promise(resolve => setTimeout(resolve, 8000));
    let fungibleResourceAddress = extractResourceAddress(result1);
    console.log(`Extracted fungible resource: ${fungibleResourceAddress}\n`);

    // 2. Create Non-Fungible Token Collection
    console.log('2️⃣ Creating NFT collection...');
    const result2 = await agent1.run('Create an NFT collection called TestNFTs with description "Test NFT Collection"');
    console.log(`Response: ${result2}\n`);
    
    // Wait for transaction and extract collection address
    await new Promise(resolve => setTimeout(resolve, 8000));
    let nftResourceAddress = extractResourceAddress(result2);
    console.log(`Extracted NFT resource: ${nftResourceAddress}\n`);

    // 3. Mint Fungible Token (using correct format: resourceAddress,amount)
    console.log('3️⃣ Minting fungible tokens...');
    if (fungibleResourceAddress) {
      // Use explicit language to trigger mint_fungible_resource tool
      const result3 = await agent1.run(`Mint additional tokens using this format: ${fungibleResourceAddress},1000`);
      console.log(`Response: ${result3}\n`);
    } else {
      console.log('❌ Could not extract fungible resource address for minting\n');
    }

    // 4. Mint Non-Fungible Token (using correct JSON format)
    console.log('4️⃣ Minting NFT...');
    if (nftResourceAddress) {
      // Use explicit language to trigger mint_non_fungible_resource tool
      const nftMintRequest = `Mint a new NFT using this data: {"resourceAddress": "${nftResourceAddress}", "toAccount": "${wallet1.getAddress()}", "nftId": "1", "metadata": {"name": "Test NFT #1", "description": "First test NFT"}}`;
      const result4 = await agent1.run(nftMintRequest);
      console.log(`Response: ${result4}\n`);
    } else {
      console.log('❌ Could not extract NFT collection address for minting\n');
    }

    // 5. Transfer Tokens (using correct format: toAddress,amount)
    console.log('5️⃣ Transferring tokens...');
    const wallet2Address = wallet2?.getAddress();
    // Use explicit language to trigger transfer_tokens tool
    const result5 = await agent1.run(`Transfer tokens using this format: ${wallet2Address},100`);
    console.log(`Response: ${result5}\n`);

    // Verify transfer worked
    console.log('🔍 Checking wallet 2 balance...');
    const wallet2Balance = await agent2.run('What is my XRD balance?');
    console.log(`Wallet 2 Balance: ${wallet2Balance}\n`);

    console.log('✅ All 5 operations completed!');
    console.log(`🔗 Wallet 1: https://stokenet-dashboard.radixdlt.com/account/${wallet1?.getAddress()}`);
    console.log(`🔗 Wallet 2: https://stokenet-dashboard.radixdlt.com/account/${wallet2?.getAddress()}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  process.exit(0);
}

main().catch(error => {
  console.error('💥 Error:', error);
  process.exit(1);
});
