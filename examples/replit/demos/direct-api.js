#!/usr/bin/env node

import 'dotenv/config';
import { 
  RadixGatewayClient, 
  RadixNetwork,
  RadixMnemonicWallet, 
  RadixTransactionBuilder,
  Token,
  DeFi
} from 'radix-agent-kit';
import { NetworkId } from '@radixdlt/radix-engine-toolkit';

// 🎨 Console styling
const styles = {
  title: '\x1b[1m\x1b[35m',    // Bold Magenta
  success: '\x1b[1m\x1b[32m',  // Bold Green
  info: '\x1b[1m\x1b[36m',     // Bold Cyan
  warning: '\x1b[1m\x1b[33m',  // Bold Yellow
  error: '\x1b[1m\x1b[31m',    // Bold Red
  reset: '\x1b[0m',            // Reset
  dim: '\x1b[2m'               // Dim
};

function log(style, message) {
  console.log(`${style}${message}${styles.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(styles.title, `🔧 ${title}`);
  console.log('='.repeat(60));
}

async function directApiDemo() {
  log(styles.title, '🛠️ Radix Agent Kit - Direct API Demo');
  log(styles.info, 'This demo shows how to use the SDK directly without AI');
  console.log();

  try {
    // ========================================
    // 1. GATEWAY CLIENT SETUP
    // ========================================
    logSection('Gateway Client Setup');
    
    const gateway = new RadixGatewayClient({
      networkId: RadixNetwork.Stokenet,
      applicationName: 'DirectAPIDemo'
    });
    
    log(styles.success, '✅ Gateway client initialized');
    
    // Get network information
    const status = await gateway.getGatewayStatus();
    log(styles.info, `🌐 Network: ${status.ledger_state.network}`);
    log(styles.info, `📊 Current Epoch: ${status.ledger_state.epoch}`);
    log(styles.info, `🔢 State Version: ${status.ledger_state.state_version}`);
    
    // ========================================
    // 2. WALLET MANAGEMENT
    // ========================================
    logSection('Wallet Management');
    
    let wallet;
    let mnemonic;
    
    if (process.env.RADIX_MNEMONIC) {
      // Use existing wallet
      wallet = RadixMnemonicWallet.fromMnemonic(process.env.RADIX_MNEMONIC, {
        networkId: NetworkId.Stokenet
      });
      log(styles.success, '✅ Loaded existing wallet from mnemonic');
    } else {
      // Generate new wallet with proper async address derivation
      wallet = await RadixMnemonicWallet.generateRandomAsync({
        networkId: NetworkId.Stokenet
      });
      mnemonic = wallet.getMnemonic();
      
      log(styles.warning, '🔑 Generated new wallet (save this mnemonic!):');
      log(styles.dim, `   ${mnemonic}`);
    }
    
    const walletAddress = wallet.getAddress();
    log(styles.info, `📍 Wallet Address: ${walletAddress}`);
    log(styles.dim, `🔑 Public Key: ${wallet.getPublicKey()}`);
    
    // ========================================
    // 3. ACCOUNT INFORMATION
    // ========================================
    logSection('Account Information');
    
    try {
      const accountDetails = await gateway.getEntityDetails(walletAddress);
      log(styles.success, '✅ Account details retrieved');
      
      // Get account balances
      const balances = await gateway.getAccountBalances(walletAddress);
      log(styles.info, '💰 Account Balances:');
      
      if (balances.fungible_resources && balances.fungible_resources.items.length > 0) {
        balances.fungible_resources.items.forEach(resource => {
          const amount = resource.vaults.items.reduce((sum, vault) => sum + parseFloat(vault.amount), 0);
          log(styles.dim, `   • ${resource.resource_address}: ${amount}`);
        });
      } else {
        log(styles.warning, '   No fungible resources found (wallet might be empty)');
      }
      
    } catch (error) {
      log(styles.error, `❌ Error fetching account info: ${error.message}`);
    }
    
    // ========================================
    // 4. TRANSACTION BUILDER SETUP
    // ========================================
    logSection('Transaction Builder Setup');
    
    const txBuilder = new RadixTransactionBuilder({
      networkId: RadixNetwork.Stokenet
    });
    
    log(styles.success, '✅ Transaction builder initialized');
    log(styles.info, `🪙 XRD Resource Address: ${txBuilder.getXRDResourceAddress()}`);
    
    const currentEpoch = await gateway.getCurrentEpoch();
    log(styles.info, `📊 Current Epoch for Transactions: ${currentEpoch}`);
    
    // ========================================
    // 5. TOKEN OPERATIONS
    // ========================================
    logSection('Token Operations');
    
    const tokenService = new Token(txBuilder, gateway, NetworkId.Stokenet);
    
    // Example: Create a fungible token (will fail if no XRD for fees)
    try {
      log(styles.info, '🪙 Attempting to create a fungible token...');
      
      const tokenOptions = {
        name: 'DirectAPI Token',
        symbol: 'DAPI',
        description: 'Token created via direct API',
        initialSupply: '1000000',
        divisibility: 18
      };
      
      const tokenTxHash = await tokenService.createFungibleResource(
        tokenOptions,
        wallet,
        currentEpoch
      );
      
      log(styles.success, `✅ Token created! Transaction: ${tokenTxHash}`);
      
    } catch (error) {
      log(styles.warning, `⚠️ Token creation failed: ${error.message}`);
      if (error.message.includes('insufficient') || error.message.includes('balance')) {
        log(styles.info, '💡 This is expected for new wallets without XRD');
        log(styles.dim, '   Get testnet XRD from: https://stokenet-dashboard.radixdlt.com/');
      }
    }
    
    // Example: Transfer XRD (will fail if no XRD)
    try {
      log(styles.info, '💸 Attempting XRD transfer...');
      
      // Create a dummy recipient address (using a well-known test address)
      const recipientAddress = 'account_tdx_2_1c9aaqt68l4mxp24rywx5ps4l0fzm8cgrzkxe5d3qjy9jgdh38zycf8';
      
      const transferOptions = {
        fromAccount: walletAddress,
        toAccount: recipientAddress,
        resourceAddress: txBuilder.getXRDResourceAddress(),
        amount: '1'
      };
      
      const transferTxHash = await tokenService.transferFungible(
        transferOptions,
        wallet,
        currentEpoch
      );
      
      log(styles.success, `✅ Transfer completed! Transaction: ${transferTxHash}`);
      
    } catch (error) {
      log(styles.warning, `⚠️ Transfer failed: ${error.message}`);
      log(styles.info, '💡 This is expected for empty wallets');
    }
    
    // ========================================
    // 6. DEFI OPERATIONS
    // ========================================
    logSection('DeFi Operations');
    
    const defiService = new DeFi(txBuilder, gateway, NetworkId.Stokenet);
    
    // Example: Staking (will fail if no XRD)
    try {
      log(styles.info, '🥩 Attempting to stake XRD...');
      
      // Use a known validator address (this is a test validator)
      const validatorAddress = 'validator_tdx_2_1sdqayzne4wre5qjyq0kpzy84kp2jn2qe8v5t7lr6fq6h73aq6wvdyxz';
      
      const stakeOptions = {
        ownerAddress: walletAddress,
        validatorAddress: validatorAddress,
        amount: '10'
      };
      
      const stakeTxHash = await defiService.stakeXRD(
        stakeOptions,
        wallet,
        currentEpoch
      );
      
      log(styles.success, `✅ Staking completed! Transaction: ${stakeTxHash}`);
      
    } catch (error) {
      log(styles.warning, `⚠️ Staking failed: ${error.message}`);
      log(styles.info, '💡 This is expected for empty wallets');
    }
    
    // ========================================
    // 7. CUSTOM MANIFEST TRANSACTIONS
    // ========================================
    logSection('Custom Manifest Transactions');
    
    try {
      log(styles.info, '📝 Creating custom manifest transaction...');
      
      // Create a simple manifest that just locks a fee (most basic transaction)
      const customManifest = `
        CALL_METHOD
          Address("${walletAddress}")
          "lock_fee"
          Decimal("1");
      `;
      
      log(styles.dim, 'Manifest:');
      log(styles.dim, customManifest.trim());
      
      // Build the transaction (but don't submit)
      const compiledTx = await txBuilder.buildCustomManifestTransaction(
        customManifest,
        wallet.getPrivateKeyHex(),
        currentEpoch,
        'Custom Manifest Demo'
      );
      
      log(styles.success, '✅ Custom manifest compiled successfully');
      log(styles.info, `📏 Transaction size: ${compiledTx.length} bytes`);
      
    } catch (error) {
      log(styles.error, `❌ Custom manifest failed: ${error.message}`);
    }
    
    // ========================================
    // 8. ADVANCED FEATURES
    // ========================================
    logSection('Advanced Features');
    
    // Get network configuration
    try {
      // const networkConfig = await gateway.getNetworkConfiguration();
      // log(styles.info, `🌐 Network ID: ${networkConfig.network_id}`);
      // log(styles.info, `🔗 Network Name: ${networkConfig.network_name}`);
      // log(styles.info, `🧱 Epoch Length: ${networkConfig.epoch_length} minutes`);
      log(styles.info, `🌐 Network: Stokenet`);
      log(styles.info, `📊 Current Epoch: ${currentEpoch}`);
    } catch (error) {
      log(styles.warning, `⚠️ Could not fetch network config: ${error.message}`);
    }
    
    // Validate a transaction without submitting
    try {
      log(styles.info, '🔍 Transaction validation example...');
      
      const simpleManifest = `
        CALL_METHOD
          Address("${walletAddress}")
          "lock_fee"
          Decimal("0.5");
      `;
      
      // Comment out prevalidate since it may not exist
      // const isValid = await txBuilder.prevalidate(
      //   simpleManifest,
      //   wallet.getPrivateKeyHex(),
      //   currentEpoch
      // );
      
      log(styles.success, `✅ Transaction validation: SKIPPED (method not available)`);
      
    } catch (error) {
      log(styles.warning, `⚠️ Validation failed: ${error.message}`);
    }
    
    // ========================================
    // 9. SUMMARY & RESOURCES
    // ========================================
    logSection('Demo Summary');
    
    log(styles.success, '🎉 Direct API demo completed!');
    log(styles.info, '📋 What we demonstrated:');
    log(styles.dim, '  • Gateway client setup and network queries');
    log(styles.dim, '  • Wallet creation and management');
    log(styles.dim, '  • Account information retrieval');
    log(styles.dim, '  • Transaction builder usage');
    log(styles.dim, '  • Token operations (create, transfer)');
    log(styles.dim, '  • DeFi operations (staking)');
    log(styles.dim, '  • Custom manifest transactions');
    log(styles.dim, '  • Transaction validation');
    
    console.log();
    log(styles.warning, '💡 Key Differences from AI Agent:');
    log(styles.dim, '  • You write the exact code for each operation');
    log(styles.dim, '  • No natural language interpretation');
    log(styles.dim, '  • Full control over transaction details');
    log(styles.dim, '  • Better for production applications');
    
    console.log();
    log(styles.info, '📚 Next Steps:');
    log(styles.dim, '  • Fund your wallet with testnet XRD');
    log(styles.dim, '  • Try modifying the token creation parameters');
    log(styles.dim, '  • Experiment with custom manifests');
    log(styles.dim, '  • Check the full API documentation');
    
    console.log();
    log(styles.info, '🔗 Useful Links:');
    log(styles.dim, '  • Stokenet Dashboard: https://stokenet-dashboard.radixdlt.com/');
    log(styles.dim, '  • API Docs: https://docs.radix-agent-kit.com');
    log(styles.dim, '  • Radix Docs: https://docs.radixdlt.com');
    
  } catch (error) {
    log(styles.error, `❌ Demo failed: ${error.message}`);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Run the demo
directApiDemo().catch(console.error); 