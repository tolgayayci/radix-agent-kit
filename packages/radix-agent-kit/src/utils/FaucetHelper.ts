import { RadixTransactionBuilder } from '../radix/RadixTransactionBuilder';
import { RadixGatewayClient, RadixNetwork } from '../radix/RadixGatewayClient';
import { RadixWallet } from '../radix/RadixWallet';
import { 
  NetworkId, 
  LTSRadixEngineToolkit,
  SimpleTransactionBuilder,
  PrivateKey,
  PublicKey
} from '@radixdlt/radix-engine-toolkit';

/**
 * Enhanced helper class for funding wallets from the Stokenet faucet
 * Provides automatic funding for newly created wallets using proper Radix transaction encoding
 */
export class FaucetHelper {
  private gatewayClient: RadixGatewayClient;
  private networkId: number;

  // Stokenet faucet component address
  private static readonly STOKENET_FAUCET_ADDRESS = 'component_tdx_2_1cptxxxxxxxxxfaucetxxxxxxxxx000527798379xxxxxxxxxyulkzl';
  
  // Stokenet XRD resource address
  private static readonly STOKENET_XRD_ADDRESS = 'resource_tdx_2_1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxtfd2jc';

  constructor(networkId: RadixNetwork = RadixNetwork.Stokenet) {
    if (networkId !== RadixNetwork.Stokenet) {
      throw new Error('Faucet helper only supports Stokenet testnet');
    }

    this.networkId = NetworkId.Stokenet;
    this.gatewayClient = new RadixGatewayClient({
      networkId: RadixNetwork.Stokenet,
      applicationName: 'FaucetHelper'
    });
  }

  /**
   * Auto-fund newly created wallets on Stokenet
   * This method should be called automatically when creating new wallets
   */
  public async autoFundNewWallet(wallet: RadixWallet, minimumAmount: number = 100): Promise<boolean> {
    try {
      console.log(`🚀 Auto-funding newly created wallet: ${wallet.getAddress()}`);
      
      // Check if wallet already has funds
      const currentBalance = await this.getXRDBalance(wallet);
      
      if (currentBalance >= minimumAmount) {
        console.log(`✅ Wallet already has sufficient balance: ${currentBalance} XRD (minimum: ${minimumAmount} XRD)`);
        return true;
      }
      
      // If account has substantial funds (10,000+ XRD), don't fund more
      if (currentBalance >= 10000) {
        console.log(`🛑 Wallet has substantial balance (${currentBalance} XRD), skipping auto-funding`);
        return true;
      }
      
      console.log(`💰 Current balance: ${currentBalance} XRD - proceeding with funding...`);
      
      // Try multiple funding methods for better reliability
      let fundingSuccessful = false;
      
      try {
        await this.fundWalletWithFaucet(wallet);
        fundingSuccessful = true;
      } catch (error) {
        console.log('🔄 Primary funding failed, trying alternative method...');
        try {
          await this.fundWalletSimple(wallet);
          fundingSuccessful = true;
        } catch (altError) {
          console.log('🔄 Alternative funding failed, trying fee-paying method...');
          try {
            await this.fundWalletWithFaucetFees(wallet);
            fundingSuccessful = true;
          } catch (feeError) {
            console.error('❌ All funding methods failed');
          }
        }
      }
      
      if (fundingSuccessful) {
        // Wait for funding to complete
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Verify funding was successful
        const newBalance = await this.getXRDBalance(wallet);
        const actuallyFunded = newBalance >= minimumAmount;
        
        if (actuallyFunded) {
          console.log(`✅ Auto-funding successful! New balance: ${newBalance} XRD`);
        } else {
          console.warn(`⚠️ Auto-funding may have failed. Balance: ${newBalance} XRD`);
        }
        
        return actuallyFunded;
      }
      
      return false;
      
    } catch (error) {
      console.error('❌ Auto-funding failed:', error);
      console.log('💡 Manual funding required. Visit: https://stokenet-dashboard.radixdlt.com/');
      return false;
    }
  }

  /**
   * Enhanced funding method that tries multiple approaches
   */
  public async fundWalletRobust(wallet: RadixWallet, amount: number = 1000): Promise<string> {
    const methods = [
      () => this.fundWalletWithFaucet(wallet),
      () => this.fundWalletSimple(wallet),
      () => this.fundWalletWithFaucetFees(wallet)
    ];

    for (let i = 0; i < methods.length; i++) {
      try {
        console.log(`💰 Trying funding method ${i + 1}/${methods.length}...`);
        const result = await methods[i]();
        console.log(`✅ Funding method ${i + 1} successful!`);
        return result;
      } catch (error) {
        console.warn(`⚠️ Funding method ${i + 1} failed:`, error);
        if (i === methods.length - 1) {
          throw new Error(`All ${methods.length} funding methods failed`);
        }
      }
    }

    throw new Error('Unexpected error in funding methods');
  }

  /**
   * Fund wallet using the official faucet method from Radix Engine Toolkit
   */
  public async fundWalletWithFaucet(wallet: RadixWallet): Promise<string> {
    try {
      console.log(`💰 Using official faucet method for ${wallet.getAddress()}`);

      const currentEpoch = await this.gatewayClient.getCurrentEpoch();

      // Use the official SimpleTransactionBuilder.freeXrdFromFaucet method
      const compiledTransaction = await SimpleTransactionBuilder.freeXrdFromFaucet({
        networkId: this.networkId,
        validFromEpoch: currentEpoch,
        toAccount: wallet.getAddress()
      });

      console.log('✅ Built faucet transaction using official method');

      // Submit transaction
      const transactionHex = compiledTransaction.toHex();
      const result = await this.gatewayClient.submitTransaction(transactionHex);
      
      if (result.duplicate) {
        console.log(`⚠️ Duplicate transaction detected`);
        return 'duplicate';
      } else {
        console.log(`✅ Faucet transaction submitted successfully`);
        console.log(`🌐 Check account: https://stokenet-dashboard.radixdlt.com/account/${wallet.getAddress()}`);
        return 'submitted';
      }

    } catch (error) {
      console.error('❌ Official faucet method failed:', error);
      throw new Error(`Failed to fund wallet with official faucet: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Alternative faucet funding method using custom manifest
   */
  public async fundWalletWithFaucetFees(wallet: RadixWallet): Promise<string> {
    try {
      console.log(`💰 Using custom faucet method for ${wallet.getAddress()}`);

      const currentEpoch = await this.gatewayClient.getCurrentEpoch();
      const privateKeyBytes = Buffer.from(wallet.getPrivateKeyHex(), 'hex');
      const privateKey = new PrivateKey.Ed25519(privateKeyBytes);
      const publicKey = privateKey.publicKey();

      // Build transaction using SimpleTransactionBuilder
      const builder = await SimpleTransactionBuilder.new({
        networkId: this.networkId,
        validFromEpoch: currentEpoch,
        fromAccount: wallet.getAddress(),
        signerPublicKey: publicKey
      });

      // Configure the transaction
      builder
        .permanentlyRejectAfterEpochs(10)
        .lockedFee("10"); // 10 XRD fee

      // Build the transaction intent
      const compiledIntent = builder.compileIntent();

      // Sign the transaction using the private key as signer
      const compiledTransaction = compiledIntent.compileNotarized(privateKey);

      console.log('✅ Built custom faucet transaction');

      // Submit transaction
      const transactionHex = compiledTransaction.toHex();
      const result = await this.gatewayClient.submitTransaction(transactionHex);
      
      console.log(`✅ Custom faucet transaction submitted successfully`);
      return result.duplicate ? 'duplicate' : 'submitted';

    } catch (error) {
      console.error('❌ Custom faucet method failed:', error);
      throw new Error(`Failed to fund wallet with custom method: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Simple faucet funding method - fallback
   */
  public async fundWalletSimple(wallet: RadixWallet): Promise<string> {
    try {
      console.log(`💰 Using simple faucet method for ${wallet.getAddress()}`);

      // Try the official method as simple fallback
      return await this.fundWalletWithFaucet(wallet);

    } catch (error) {
      console.error('❌ Simple faucet method failed:', error);
      throw new Error(`Failed to fund wallet with simple method: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if wallet has minimum balance
   */
  public async hasMinimumBalance(wallet: RadixWallet, minimumAmount: number = 100): Promise<boolean> {
    try {
      const balance = await this.getXRDBalance(wallet);
      return balance >= minimumAmount;
    } catch (error) {
      console.warn('Error checking balance:', error);
      return false;
    }
  }

  /**
   * Ensure wallet has minimum balance, fund if necessary
   */
  public async ensureMinimumBalance(
    wallet: RadixWallet, 
    minimumAmount: number = 100, 
    fundAmount: number = 1000
  ): Promise<boolean> {
    try {
      const hasMinimum = await this.hasMinimumBalance(wallet, minimumAmount);
      
      if (hasMinimum) {
        console.log(`✅ Wallet already has sufficient balance (${minimumAmount} XRD)`);
        return true;
      }
      
      console.log(`💰 Wallet needs funding. Requesting testnet XRD...`);
      await this.fundWalletRobust(wallet, fundAmount);
      
      // Wait and check again
      await new Promise(resolve => setTimeout(resolve, 3000));
      return await this.hasMinimumBalance(wallet, minimumAmount);
      
    } catch (error) {
      console.error('Error ensuring minimum balance:', error);
      return false;
    }
  }

  /**
   * Get XRD balance for a wallet
   */
  public async getXRDBalance(wallet: RadixWallet): Promise<number> {
    try {
      const accountDetails = await this.gatewayClient.getAccountBalances(wallet.getAddress());
      
      if (!accountDetails?.items?.[0]?.fungible_resources?.items) {
        return 0;
      }

      const xrdResource = accountDetails.items[0].fungible_resources.items.find(
        (resource: any) => resource.resource_address === FaucetHelper.STOKENET_XRD_ADDRESS
      );

      if (!xrdResource?.vaults?.items?.[0]?.amount) {
        return 0;
      }

      // The amount is already in XRD, not atto-XRD
      const balance = parseFloat(xrdResource.vaults.items[0].amount);
      console.log(`🔍 Raw balance from API: ${xrdResource.vaults.items[0].amount}`);
      console.log(`🔍 Parsed balance: ${balance}`);
      return balance;
    } catch (error) {
      console.warn('Error fetching XRD balance:', error);
      return 0;
    }
  }
} 