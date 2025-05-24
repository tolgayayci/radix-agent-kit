import { RadixGatewayClient } from './RadixGatewayClient';
import { RadixWallet } from './RadixWallet';
import { RadixMnemonicWallet } from './MnemonicWallet';
import { NetworkId } from '@radixdlt/radix-engine-toolkit';

export interface AccountInfo {
  address: string;
  publicKey?: string;
  balance?: Record<string, number>;
  metadata?: Record<string, any>;
  state?: any;
}

export interface AccountBalance {
  resourceAddress: string;
  amount: string;
  resourceType: 'Fungible' | 'NonFungible';
  metadata?: Record<string, any>;
}

export interface CreateAccountOptions {
  networkId: number;
  applicationName?: string;
  mnemonic?: string; // Optional: provide existing mnemonic
}

export class RadixAccount {
  private gatewayClient: RadixGatewayClient;
  private wallet?: RadixWallet;
  private networkId: number;

  constructor(gatewayClient: RadixGatewayClient, networkId: number, wallet?: RadixWallet) {
    this.gatewayClient = gatewayClient;
    this.networkId = networkId;
    this.wallet = wallet;
  }

  /**
   * Get account information from the ledger
   */
  public async getAccountInfo(accountAddress: string): Promise<AccountInfo> {
    try {
      const response = await this.gatewayClient.getEntityDetails(accountAddress, {
        opt_ins: {
          explicit_metadata: ['name', 'description', 'account_type'],
        }
      });

      const accountInfo: AccountInfo = {
        address: accountAddress,
        state: response.items[0]?.details,
        metadata: response.items[0]?.metadata?.items || {}
      };

      // Extract public key if available - updated type check
      if (response.items[0]?.details?.type === 'Component') {
        const accountDetails = response.items[0].details as any;
        if (accountDetails.state?.public_key) {
          accountInfo.publicKey = accountDetails.state.public_key;
        }
      }

      return accountInfo;
    } catch (error) {
      console.error('Error fetching account info:', error);
      throw new Error(`Failed to fetch account info for ${accountAddress}: ${error}`);
    }
  }

  /**
   * Get account balances
   */
  public async getBalances(accountAddress: string): Promise<AccountBalance[]> {
    try {
      const response = await this.gatewayClient.getAccountBalances(accountAddress);
      const balances: AccountBalance[] = [];

      if (response.items && response.items.length > 0) {
        const accountData = response.items[0];
        
        if (accountData.fungible_resources) {
          for (const resource of accountData.fungible_resources.items) {
            balances.push({
              resourceAddress: resource.resource_address,
              amount: resource.amount,
              resourceType: 'Fungible',
              metadata: resource.metadata
            });
          }
        }

        if (accountData.non_fungible_resources) {
          for (const resource of accountData.non_fungible_resources.items) {
            balances.push({
              resourceAddress: resource.resource_address,
              amount: resource.amount.toString(),
              resourceType: 'NonFungible',
              metadata: resource.metadata
            });
          }
        }
      }

      return balances;
    } catch (error) {
      console.error('Error fetching account balances:', error);
      throw new Error(`Failed to fetch balances for ${accountAddress}: ${error}`);
    }
  }

  /**
   * Get XRD balance for an account
   */
  public async getXRDBalance(accountAddress: string): Promise<string> {
    const balances = await this.getBalances(accountAddress);
    const xrdResource = this.getXRDResourceAddress();
    
    const xrdBalance = balances.find(balance => 
      balance.resourceAddress === xrdResource && balance.resourceType === 'Fungible'
    );

    return xrdBalance?.amount || '0';
  }

  /**
   * Create a new local account with mnemonic wallet
   */
  public static createNewLocalAccount(options: CreateAccountOptions): RadixAccount {
    const wallet = options.mnemonic 
      ? RadixMnemonicWallet.fromMnemonic(options.mnemonic, {
          networkId: options.networkId,
          applicationName: options.applicationName || 'RadixAgentKit'
        })
      : RadixMnemonicWallet.generateRandom({
          networkId: options.networkId,
          applicationName: options.applicationName || 'RadixAgentKit'
        });

    // Create gateway client
    const networkType = options.networkId === NetworkId.Mainnet ? 'mainnet' : 'stokenet';
    const gatewayClient = new RadixGatewayClient({
      networkId: networkType as any,
      applicationName: options.applicationName || 'RadixAgentKit'
    });

    return new RadixAccount(gatewayClient, options.networkId, wallet);
  }

  /**
   * Create account instance from existing wallet
   */
  public static fromWallet(
    wallet: RadixWallet, 
    gatewayClient: RadixGatewayClient,
    networkId: number
  ): RadixAccount {
    return new RadixAccount(gatewayClient, networkId, wallet);
  }

  /**
   * Get the wallet associated with this account
   */
  public getWallet(): RadixWallet {
    if (!this.wallet) {
      throw new Error('No wallet associated with this account');
    }
    return this.wallet;
  }

  /**
   * Get the account address
   */
  public getAddress(): string {
    if (!this.wallet) {
      throw new Error('No wallet associated with this account');
    }
    return this.wallet.getAddress();
  }

  /**
   * Get the public key
   */
  public getPublicKey(): string {
    if (!this.wallet) {
      throw new Error('No wallet associated with this account');
    }
    return this.wallet.getPublicKey();
  }

  /**
   * Check if account exists on ledger
   */
  public async exists(accountAddress?: string): Promise<boolean> {
    const address = accountAddress || this.getAddress();
    try {
      await this.getAccountInfo(address);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate if an address is a valid account address
   */
  public static isValidAccountAddress(address: string): boolean {
    // Basic validation for account address format
    const patterns = [
      /^account_rdx1[a-z0-9]+$/, // Mainnet
      /^account_tdx_2_1[a-z0-9]+$/, // Stokenet
      /^account_sim1[a-z0-9]+$/, // Simulator
    ];
    
    return patterns.some(pattern => pattern.test(address));
  }

  /**
   * Get the XRD resource address for the current network
   */
  private getXRDResourceAddress(): string {
    switch (this.networkId) {
      case NetworkId.Mainnet:
        return 'resource_rdx1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxradxrd';
      case NetworkId.Stokenet:
        return 'resource_tdx_2_1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxtfd2jc';
      default:
        return 'resource_sim1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxakj8n3';
    }
  }

  /**
   * Get account transaction history (if supported by Gateway)
   */
  public async getTransactionHistory(accountAddress?: string, limit: number = 10): Promise<any[]> {
    const address = accountAddress || this.getAddress();
    try {
      // This would require a different Gateway API endpoint
      // For now, return empty array as placeholder
      console.warn('Transaction history not yet implemented');
      return [];
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      throw error;
    }
  }

  /**
   * Get the gateway client
   */
  public getGatewayClient(): RadixGatewayClient {
    return this.gatewayClient;
  }

  /**
   * Get network ID
   */
  public getNetworkId(): number {
    return this.networkId;
  }
}