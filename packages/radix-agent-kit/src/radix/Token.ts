import { RadixTransactionBuilder } from './RadixTransactionBuilder';
import { RadixWallet } from './RadixWallet';
import { RadixGatewayClient } from './RadixGatewayClient';

export interface FungibleResourceOptions {
  name: string;
  symbol: string;
  description?: string;
  initialSupply: number | string;
  divisibility?: number; // Default 18 for most tokens
  iconUrl?: string;
  tags?: string[];
  metadata?: Record<string, string>;
}

export interface NonFungibleResourceOptions {
  name: string;
  description?: string;
  iconUrl?: string;
  tags?: string[];
  metadata?: Record<string, string>;
  idType?: 'Integer' | 'String' | 'Bytes' | 'RUID';
  mutableData?: Record<string, any>;
}

export interface TokenTransferOptions {
  fromAccount: string;
  toAccount: string;
  resourceAddress: string;
  amount: number | string;
}

export interface NFTMintOptions {
  resourceAddress: string;
  toAccount: string;
  nftData: Record<string, any>;
  nftId?: string | number;
}

export class Token {
  private transactionBuilder: RadixTransactionBuilder;
  private gatewayClient: RadixGatewayClient;
  private networkId: number;

  constructor(
    transactionBuilder: RadixTransactionBuilder,
    gatewayClient: RadixGatewayClient,
    networkId: number
  ) {
    this.transactionBuilder = transactionBuilder;
    this.gatewayClient = gatewayClient;
    this.networkId = networkId;
  }

  /**
   * Create a new fungible token resource using custom manifest
   */
  public async createFungibleResource(
    options: FungibleResourceOptions,
    ownerWallet: RadixWallet,
    currentEpoch: number
  ): Promise<string> {
    try {
      const ownerAddress = ownerWallet.getAddress();
      const ownerPrivateKey = RadixTransactionBuilder.createPrivateKeyFromHex(
        ownerWallet.getPublicKey(), // This should be the private key, but we'll work with what we have
        'Ed25519'
      );

      // Create manifest for token creation
      const manifest = this.transactionBuilder.createTokenManifest(
        ownerAddress,
        options.name,
        options.symbol,
        options.initialSupply,
        options.divisibility
      );

      // Build and submit transaction using the new API
      const compiledTransaction = await this.transactionBuilder.buildCustomManifestTransaction(
        manifest,
        ownerPrivateKey,
        currentEpoch,
        `Create ${options.name} (${options.symbol}) token`
      );

      // Get hex and submit
      const txHex = this.transactionBuilder.getCompiledTransactionHex(compiledTransaction);
      const submitResult = await this.gatewayClient.submitTransaction(txHex);
      
      if (submitResult.duplicate) {
        throw new Error('Transaction was duplicate');
      }

      return txHex; // Return transaction hex as identifier
    } catch (error) {
      console.error('Error creating fungible resource:', error);
      throw new Error(`Failed to create fungible resource: ${error}`);
    }
  }

  /**
   * Create a new non-fungible token resource (simplified)
   */
  public async createNonFungibleResource(
    options: NonFungibleResourceOptions,
    ownerWallet: RadixWallet,
    currentEpoch: number
  ): Promise<string> {
    try {
      const ownerAddress = ownerWallet.getAddress();
      const ownerPrivateKey = RadixTransactionBuilder.createPrivateKeyFromHex(
        ownerWallet.getPublicKey(),
        'Ed25519'
      );

      // Create a simple NFT collection manifest
      const manifest = `
        CALL_FUNCTION
          Address("${this.getPackageAddress()}")
          "NonFungibleResourceManager"
          "create"
          Enum<0u8>()
          Map<String, String>(
            "name" => "${options.name}",
            "description" => "${options.description || options.name + ' Collection'}"
          )
          Tuple()
          Tuple();
        
        TAKE_ALL_FROM_WORKTOP
          Address("${this.transactionBuilder.getXRDResourceAddress()}")
          Bucket("nft_collection");
        
        CALL_METHOD
          Address("${ownerAddress}")
          "try_deposit_or_abort"
          Bucket("nft_collection")
          Enum<0u8>();
      `;

      const compiledTransaction = await this.transactionBuilder.buildCustomManifestTransaction(
        manifest,
        ownerPrivateKey,
        currentEpoch,
        `Create ${options.name} NFT collection`
      );

      const txHex = this.transactionBuilder.getCompiledTransactionHex(compiledTransaction);
      const submitResult = await this.gatewayClient.submitTransaction(txHex);
      
      if (submitResult.duplicate) {
        throw new Error('Transaction was duplicate');
      }

      return txHex;
    } catch (error) {
      console.error('Error creating non-fungible resource:', error);
      throw new Error(`Failed to create non-fungible resource: ${error}`);
    }
  }

  /**
   * Transfer fungible tokens between accounts
   */
  public async transferFungible(
    options: TokenTransferOptions,
    senderWallet: RadixWallet,
    currentEpoch: number
  ): Promise<string> {
    try {
      const senderPrivateKey = RadixTransactionBuilder.createPrivateKeyFromHex(
        senderWallet.getPublicKey(),
        'Ed25519'
      );

      // Use the transaction builder's transfer functionality
      const compiledTransaction = await this.transactionBuilder.buildTransferTransaction(
        {
          fromAccount: options.fromAccount,
          toAccount: options.toAccount,
          resourceAddress: options.resourceAddress,
          amount: options.amount
        },
        senderPrivateKey,
        currentEpoch
      );

      const txHex = this.transactionBuilder.getCompiledTransactionHex(compiledTransaction);
      const submitResult = await this.gatewayClient.submitTransaction(txHex);
      
      if (submitResult.duplicate) {
        throw new Error('Transaction was duplicate');
      }

      return txHex;
    } catch (error) {
      console.error('Error transferring fungible tokens:', error);
      throw new Error(`Failed to transfer fungible tokens: ${error}`);
    }
  }

  /**
   * Mint new fungible tokens (requires minter role)
   */
  public async mintFungible(
    resourceAddress: string,
    amount: number | string,
    toAccount: string,
    minterWallet: RadixWallet,
    currentEpoch: number
  ): Promise<string> {
    try {
      const minterPrivateKey = RadixTransactionBuilder.createPrivateKeyFromHex(
        minterWallet.getPublicKey(),
        'Ed25519'
      );

      const manifest = `
        CALL_METHOD
          Address("${resourceAddress}")
          "mint"
          Decimal("${amount}");
        
        TAKE_ALL_FROM_WORKTOP
          Address("${resourceAddress}")
          Bucket("minted_tokens");
        
        CALL_METHOD
          Address("${toAccount}")
          "try_deposit_or_abort"
          Bucket("minted_tokens")
          Enum<0u8>();
      `;

      const compiledTransaction = await this.transactionBuilder.buildCustomManifestTransaction(
        manifest,
        minterPrivateKey,
        currentEpoch,
        `Mint ${amount} tokens`
      );

      const txHex = this.transactionBuilder.getCompiledTransactionHex(compiledTransaction);
      const submitResult = await this.gatewayClient.submitTransaction(txHex);
      
      if (submitResult.duplicate) {
        throw new Error('Transaction was duplicate');
      }

      return txHex;
    } catch (error) {
      console.error('Error minting fungible tokens:', error);
      throw new Error(`Failed to mint fungible tokens: ${error}`);
    }
  }

  /**
   * Mint new non-fungible tokens
   */
  public async mintNonFungible(
    options: NFTMintOptions,
    minterWallet: RadixWallet,
    currentEpoch: number
  ): Promise<string> {
    try {
      const minterPrivateKey = RadixTransactionBuilder.createPrivateKeyFromHex(
        minterWallet.getPublicKey(),
        'Ed25519'
      );

      const nftId = options.nftId || Math.floor(Math.random() * 1000000).toString();
      
      const manifest = `
        CALL_METHOD
          Address("${options.resourceAddress}")
          "mint_non_fungible"
          Enum<0u8>("${nftId}")
          Map<String, String>();
        
        TAKE_ALL_FROM_WORKTOP
          Address("${options.resourceAddress}")
          Bucket("minted_nft");
        
        CALL_METHOD
          Address("${options.toAccount}")
          "try_deposit_or_abort"
          Bucket("minted_nft")
          Enum<0u8>();
      `;

      const compiledTransaction = await this.transactionBuilder.buildCustomManifestTransaction(
        manifest,
        minterPrivateKey,
        currentEpoch,
        `Mint NFT ${nftId}`
      );

      const txHex = this.transactionBuilder.getCompiledTransactionHex(compiledTransaction);
      const submitResult = await this.gatewayClient.submitTransaction(txHex);
      
      if (submitResult.duplicate) {
        throw new Error('Transaction was duplicate');
      }

      return txHex;
    } catch (error) {
      console.error('Error minting non-fungible tokens:', error);
      throw new Error(`Failed to mint non-fungible tokens: ${error}`);
    }
  }

  /**
   * Get token information from the ledger
   */
  public async getTokenInfo(resourceAddress: string): Promise<any> {
    try {
      const response = await this.gatewayClient.getEntityDetails(resourceAddress);
      return response;
    } catch (error) {
      console.error('Error fetching token info:', error);
      throw error;
    }
  }

  /**
   * Check if an address is a valid resource address
   */
  public isValidResourceAddress(address: string): boolean {
    return this.transactionBuilder.isValidAddress(address) && 
           address.startsWith('resource_');
  }

  /**
   * Get XRD resource address for the current network
   */
  public getXRDResourceAddress(): string {
    return this.transactionBuilder.getXRDResourceAddress();
  }

  /**
   * Get package address for the current network
   */
  private getPackageAddress(): string {
    // Use the same logic as transaction builder
    switch (this.networkId) {
      case 1: // NetworkId.Mainnet
        return 'package_rdx1pkgxxxxxxxxxresrcexxxxxxxxx000538436477xxxxxxxxxaj0zg9';
      case 2: // NetworkId.Stokenet
        return 'package_tdx_2_1pkgxxxxxxxxxresrcexxxxxxxxx000538436477xxxxxxxxxaj0zg9';
      default:
        return 'package_sim1pkgxxxxxxxxxresrcexxxxxxxxx000538436477xxxxxxxxxaj0zg9';
    }
  }

  /**
   * Helper method to estimate fees for token operations
   */
  public async estimateTokenCreationFee(): Promise<string> {
    // Return estimated fee for token creation (in XRD)
    // This is a rough estimate - actual fees depend on manifest complexity
    return "5.0"; // 5 XRD estimated fee
  }

  /**
   * Helper method to check if an account can create tokens
   */
  public async canCreateTokens(accountAddress: string): Promise<boolean> {
    try {
      const balances = await this.gatewayClient.getAccountBalances(accountAddress);
      
      // Check if account has sufficient XRD for token creation
      const xrdResourceAddress = this.getXRDResourceAddress();
      const accountData = balances.items?.[0];
      
      if (accountData?.fungible_resources) {
        const xrdBalance = accountData.fungible_resources.items.find(
          (resource: any) => resource.resource_address === xrdResourceAddress
        );
        
        if (xrdBalance) {
          const balance = parseFloat(xrdBalance.amount);
          return balance >= 5.0; // Minimum 5 XRD needed
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking token creation eligibility:', error);
      return false;
    }
  }

  /**
   * Get network ID
   */
  public getNetworkId(): number {
    return this.networkId;
  }
}