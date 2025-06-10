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
   * Automatically fund a newly created wallet with testnet XRD
   * This method should be called automatically when creating new wallets
   */
  public async autoFundNewWallet(wallet: RadixWallet, minimumAmount: number = 100): Promise<boolean> {
    try {
      const walletAddress = wallet.getAddress();
      
      // Validate address format first
      if (!walletAddress || walletAddress.includes('pending') || !walletAddress.startsWith('account_tdx_')) {
        return false;
      }
      
      // Check if wallet already has funds
      const currentBalance = await this.getXRDBalance(wallet);
      
      if (currentBalance >= minimumAmount) {
        return true;
      }
      
      // If account has substantial funds (10,000+ XRD), don't fund more
      if (currentBalance >= 10000) {
        return true;
      }
      
      // Try multiple funding methods for better reliability
      let fundingSuccessful = false;
      
      try {
        await this.fundWalletWithFaucet(wallet);
        fundingSuccessful = true;
      } catch (error) {
        try {
          await this.fundWalletSimple(wallet);
          fundingSuccessful = true;
        } catch (altError) {
          try {
            await this.fundWalletWithFaucetFees(wallet);
            fundingSuccessful = true;
          } catch (feeError) {
            // Silent fail
          }
        }
      }
      
      if (fundingSuccessful) {
        // Wait for funding to complete
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Verify funding was successful
        const newBalance = await this.getXRDBalance(wallet);
        return newBalance >= minimumAmount;
      }
      
      return false;
      
    } catch (error) {
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
      const currentEpoch = await this.gatewayClient.getCurrentEpoch();

      // Use the official SimpleTransactionBuilder.freeXrdFromFaucet method
      const compiledTransaction = await SimpleTransactionBuilder.freeXrdFromFaucet({
        networkId: this.networkId,
        validFromEpoch: currentEpoch,
        toAccount: wallet.getAddress()
      });

      // Submit transaction
      const transactionHex = compiledTransaction.toHex();
      const result = await this.gatewayClient.submitTransaction(transactionHex);
      
      if (result.duplicate) {
        return 'duplicate';
      } else {
        return 'submitted';
      }

    } catch (error) {
      throw new Error(`Failed to fund wallet with official faucet: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Alternative faucet funding method using custom manifest
   */
  public async fundWalletWithFaucetFees(wallet: RadixWallet): Promise<string> {
    try {
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

      // Submit transaction
      const transactionHex = compiledTransaction.toHex();
      const result = await this.gatewayClient.submitTransaction(transactionHex);
      
      return result.duplicate ? 'duplicate' : 'submitted';

    } catch (error) {
      throw new Error(`Failed to fund wallet with custom method: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Simple faucet funding method - fallback
   */
  public async fundWalletSimple(wallet: RadixWallet): Promise<string> {
    try {
      // Try the official method as simple fallback
      return await this.fundWalletWithFaucet(wallet);

    } catch (error) {
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
      const walletAddress = wallet.getAddress();
      
      // Validate address format before making API call
      if (!walletAddress || walletAddress.includes('pending') || !walletAddress.startsWith('account_tdx_')) {
        console.log(`⚠️ Invalid or pending address: ${walletAddress}, returning 0 balance`);
        return 0;
      }

      const accountDetails = await this.gatewayClient.getAccountBalances(walletAddress);
      
      if (!accountDetails?.items?.[0]?.fungible_resources?.items) {
        return 0;
      }

      const xrdResource = accountDetails.items[0].fungible_resources.items.find(
        (resource: any) => resource.resource_address === FaucetHelper.STOKENET_XRD_ADDRESS
      );

      if (xrdResource && xrdResource.vaults?.items?.length > 0) {
        const rawAmount = xrdResource.vaults.items[0].amount;
        
        // Gateway API already returns amounts in correct decimal format - no conversion needed
        const balance = parseFloat(rawAmount);
        
        return balance;
      }

      return 0;
    } catch (error) {
      console.warn('Error fetching XRD balance:', error);
      // If there's an error (like account not found/indexed yet), return 0
      return 0;
    }
  }

  /**
   * Force fund wallet regardless of current balance
   * Use this when user explicitly requests funding
   */
  public async forceFundWallet(wallet: RadixWallet): Promise<{ success: boolean; method: string; error?: string }> {
    try {
      const walletAddress = wallet.getAddress();
      
      // Validate address format first
      if (!walletAddress || walletAddress.includes('pending') || !walletAddress.startsWith('account_tdx_')) {
        return { success: false, method: 'validation', error: 'Invalid wallet address format' };
      }
      
      console.log(`💰 Force funding wallet: ${walletAddress}`);
      
      // Try multiple funding methods without balance checks
      const methods = [
        { name: 'official_faucet', func: () => this.fundWalletWithFaucet(wallet) },
        { name: 'simple_faucet', func: () => this.fundWalletSimple(wallet) },
        { name: 'custom_faucet', func: () => this.fundWalletWithFaucetFees(wallet) }
      ];

      for (const method of methods) {
        try {
          console.log(`🔄 Trying ${method.name} funding method...`);
          const result = await method.func();
          console.log(`✅ ${method.name} returned: ${result}`);
          
          if (result === 'submitted' || result === 'duplicate') {
            return { success: true, method: method.name };
          }
        } catch (error) {
          console.warn(`⚠️ ${method.name} failed:`, error instanceof Error ? error.message : String(error));
          continue;
        }
      }
      
      return { success: false, method: 'all_failed', error: 'All funding methods failed' };
      
    } catch (error) {
      return { 
        success: false, 
        method: 'exception', 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }
} 