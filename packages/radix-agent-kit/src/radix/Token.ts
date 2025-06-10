import { RadixTransactionBuilder } from './RadixTransactionBuilder';
import { RadixWallet } from './RadixWallet';
import { RadixGatewayClient } from './RadixGatewayClient';
import { RadixEngineToolkit } from '@radixdlt/radix-engine-toolkit';

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
  maxSupply?: number;
  iconUrl?: string;
  tags?: string[];
  nftDataSchema?: any;
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
  nftId?: string;
  nftData?: Record<string, any>;
}

// NFT operations interface
export interface NFTOperations {
  tokenId: string;
  name?: string;
  description?: string;
  imageUrl?: string;
  metadata?: Record<string, any>;
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
   * Create a new fungible token resource using the new transaction builder
   */
  public async createFungibleResource(
    options: FungibleResourceOptions,
    ownerWallet: RadixWallet,
    currentEpoch: number
  ): Promise<string> {
    try {
      const ownerAddress = ownerWallet.getAddress();
      const ownerPrivateKey = RadixTransactionBuilder.createPrivateKeyFromHex(
        ownerWallet.getPrivateKeyHex(),
        'Ed25519'
      );

      // Create fungible resource manifest
      const manifest = this.transactionBuilder.createTokenManifest(
        ownerAddress,
        options.name,
        options.symbol,
        options.initialSupply.toString(),
        options.divisibility || 18
      );

      // Build transaction using custom manifest
      const { transaction, compiled } = await this.transactionBuilder.buildCustomManifestTransaction(
        manifest,
        ownerPrivateKey,
        currentEpoch,
        `Create ${options.name} (${options.symbol}) token`
      );

      // Extract intent hash BEFORE submitting for proper tracking
      const intentHashObj = await RadixEngineToolkit.NotarizedTransaction.intentHash(transaction);
      
      // The intent hash object has an 'id' property with the properly formatted transaction ID
      const intentHash = intentHashObj.id;
      
      // Get hex and submit
      const txHex = this.transactionBuilder.getCompiledTransactionHex(compiled);
      const submitResult = await this.gatewayClient.submitTransaction(txHex);
      
      if (submitResult.duplicate) {
        console.log(`⚠️ Transaction ${intentHash} was duplicate - may have been submitted before`);
      }

      console.log(`✅ Fungible token ${options.name} (${options.symbol}) transaction submitted: ${intentHash}`);
      return intentHash;
    } catch (error) {
      console.error('Error creating fungible resource:', error);
      throw new Error(`Failed to create fungible resource: ${error}`);
    }
  }

  /**
   * Create a new non-fungible token resource (NFT collection)
   */
  public async createNonFungibleResource(
    options: NonFungibleResourceOptions,
    ownerWallet: RadixWallet,
    currentEpoch: number
  ): Promise<string> {
    try {
      const ownerAddress = ownerWallet.getAddress();
      const ownerPrivateKey = RadixTransactionBuilder.createPrivateKeyFromHex(
        ownerWallet.getPrivateKeyHex(),
        'Ed25519'
      );

      // Create NFT collection manifest with proper schema for 3 string fields (name, description, image)
      const manifest = `
        CALL_METHOD
          Address("${ownerAddress}")
          "lock_fee"
          Decimal("10");
        
        CREATE_NON_FUNGIBLE_RESOURCE
          Enum<OwnerRole::None>()
          Enum<NonFungibleIdType::Integer>()
          true
          Enum<0u8>(
            Enum<0u8>(
              Tuple(
                Array<Enum>(
                  Enum<14u8>(
                    Array<Enum>(
                      Enum<0u8>(12u8),
                      Enum<0u8>(12u8),
                      Enum<0u8>(12u8)
                    )
                  )
                ),
                Array<Tuple>(
                  Tuple(
                    Enum<1u8>("NFTData"),
                    Enum<1u8>(
                      Enum<0u8>(
                        Array<String>(
                          "name",
                          "description",
                          "image"
                        )
                      )
                    )
                  )
                ),
                Array<Enum>(
                  Enum<0u8>()
                )
              )
            ),
            Enum<1u8>(0u64),
            Array<String>()
          )
          Tuple(
            Some(
              Tuple(
                Some(Enum<AccessRule::AllowAll>()),
                Some(Enum<AccessRule::DenyAll>())
              )
            ),
            None,
            None,
            None,
            None,
            None,
            None
          )
          Tuple(
            Map<String, Tuple>(
              "name" => Tuple(
                Some(Enum<Metadata::String>("${options.name}")),
                true
              ),
              "description" => Tuple(
                Some(Enum<Metadata::String>("${options.description || `${options.name} NFT Collection`}")),
                true
              )
            ),
            Map<String, Enum>(
              "metadata_setter" => Some(Enum<AccessRule::AllowAll>()),
              "metadata_setter_updater" => None,
              "metadata_locker" => Some(Enum<AccessRule::DenyAll>()),
              "metadata_locker_updater" => None
            )
          )
          None;
        
        CALL_METHOD
          Address("${ownerAddress}")
          "deposit_batch"
          Expression("ENTIRE_WORKTOP");
      `;

      // Build transaction using custom manifest
      const { transaction, compiled } = await this.transactionBuilder.buildCustomManifestTransaction(
        manifest,
        ownerPrivateKey,
        currentEpoch,
        `Create ${options.name} NFT collection`
      );

      // Extract intent hash BEFORE submitting for proper tracking
      const intentHashObj = await RadixEngineToolkit.NotarizedTransaction.intentHash(transaction);
      
      // The intent hash object has an 'id' property with the properly formatted transaction ID
      const intentHash = intentHashObj.id;
      
      // Get hex and submit
      const txHex = this.transactionBuilder.getCompiledTransactionHex(compiled);
      const submitResult = await this.gatewayClient.submitTransaction(txHex);
      
      if (submitResult.duplicate) {
        console.log(`⚠️ Transaction ${intentHash} was duplicate - may have been submitted before`);
      }

      console.log(`✅ NFT collection ${options.name} transaction submitted: ${intentHash}`);
      return intentHash;
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
        senderWallet.getPrivateKeyHex(),
        'Ed25519'
      );

      // Create transfer manifest using correct Radix pattern
      // Use try_deposit_batch_or_abort instead of deposit_batch to avoid requiring recipient signature
      const manifest = `
        CALL_METHOD
          Address("${options.fromAccount}")
          "lock_fee"
          Decimal("10");
        
        CALL_METHOD
          Address("${options.fromAccount}")
          "withdraw"
          Address("${options.resourceAddress}")
          Decimal("${options.amount}");
        
        CALL_METHOD
          Address("${options.toAccount}")
          "try_deposit_batch_or_abort"
          Expression("ENTIRE_WORKTOP")
          None;
      `;

      // Build transaction using custom manifest (same pattern as create methods)
      const { transaction, compiled } = await this.transactionBuilder.buildCustomManifestTransaction(
        manifest,
        senderPrivateKey,
        currentEpoch,
        `Transfer ${options.amount} tokens`
      );

      // Extract intent hash BEFORE submitting for proper tracking
      const intentHashObj = await RadixEngineToolkit.NotarizedTransaction.intentHash(transaction);
      const intentHash = intentHashObj.id;
      
      // Get hex and submit
      const txHex = this.transactionBuilder.getCompiledTransactionHex(compiled);
      const submitResult = await this.gatewayClient.submitTransaction(txHex);
      
      if (submitResult.duplicate) {
        console.log(`⚠️ Transfer transaction ${intentHash} was duplicate - may have been submitted before`);
      }

      console.log(`✅ Transfer completed: ${intentHash}`);
      return intentHash;
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
    amount: string,
    toAccount: string,
    minterWallet: RadixWallet,
    currentEpoch: number
  ): Promise<string> {
    try {
      console.log(`🔨 Minting ${amount} fungible tokens of ${resourceAddress}`);
      
      const minterPrivateKey = RadixTransactionBuilder.createPrivateKeyFromHex(
        minterWallet.getPrivateKeyHex(),
        'Ed25519'
      );
      
      // Use MINT_FUNGIBLE instruction directly
      const manifest = `
        CALL_METHOD
          Address("${minterWallet.getAddress()}")
          "lock_fee"
          Decimal("10");
        
        MINT_FUNGIBLE
          Address("${resourceAddress}")
          Decimal("${amount}");
        
        CALL_METHOD
          Address("${toAccount}")
          "deposit_batch"
          Expression("ENTIRE_WORKTOP");
      `;

      const { transaction, compiled } = await this.transactionBuilder.buildCustomManifestTransaction(
        manifest,
        minterPrivateKey,
        currentEpoch,
        `Mint ${amount} fungible tokens`
      );

      // Extract intent hash BEFORE submitting for proper tracking
      const intentHashObj = await RadixEngineToolkit.NotarizedTransaction.intentHash(transaction);
      const intentHash = intentHashObj.id;

      const txHex = this.transactionBuilder.getCompiledTransactionHex(compiled);
      const submitResult = await this.gatewayClient.submitTransaction(txHex);
      
      if (submitResult.duplicate) {
        console.log(`⚠️ Mint transaction ${intentHash} was duplicate - may have been submitted before`);
      }

      console.log(`✅ Minted ${amount} tokens: ${intentHash}`);
      return intentHash;
    } catch (error) {
      console.error('Error minting fungible tokens:', error);
      throw new Error(`Failed to mint fungible tokens: ${error}`);
    }
  }

  /**
   * Mint new non-fungible tokens
   */
  public async mintNonFungible(
    resourceAddress: string,
    toAccount: string,
    nftData: { nftId: string; metadata: any },
    minterWallet: RadixWallet,
    currentEpoch: number
  ): Promise<string> {
    try {
      console.log(`🎨 Minting NFT ${nftData.nftId} to ${resourceAddress}`);
      
      const minterPrivateKey = RadixTransactionBuilder.createPrivateKeyFromHex(
        minterWallet.getPrivateKeyHex(),
        'Ed25519'
      );
      
      // Extract metadata fields - using exactly 3 string values as expected by our schema
      const name = nftData.metadata?.name || `NFT #${nftData.nftId}`;
      const description = nftData.metadata?.description || `NFT ${nftData.nftId} description`;
      const image = nftData.metadata?.image || nftData.metadata?.imageUrl || 'https://via.placeholder.com/400x400.png';
      
      // Use correct MINT_NON_FUNGIBLE instruction with proper tuple format for 3 string fields
      const manifest = `
        CALL_METHOD
          Address("${minterWallet.getAddress()}")
          "lock_fee"
          Decimal("10");
        
        MINT_NON_FUNGIBLE
          Address("${resourceAddress}")
          Map<NonFungibleLocalId, Tuple>(
            NonFungibleLocalId("#${nftData.nftId}#") => Tuple(
              Tuple(
                "${name}",
                "${description}",
                "${image}"
              )
            )
          );
        
        CALL_METHOD
          Address("${toAccount}")
          "deposit_batch"
          Expression("ENTIRE_WORKTOP");
      `;

      const { transaction, compiled } = await this.transactionBuilder.buildCustomManifestTransaction(
        manifest,
        minterPrivateKey,
        currentEpoch,
        `Mint NFT ${nftData.nftId}`
      );

      // Extract intent hash BEFORE submitting for proper tracking
      const intentHashObj = await RadixEngineToolkit.NotarizedTransaction.intentHash(transaction);
      const intentHash = intentHashObj.id;

      const txHex = this.transactionBuilder.getCompiledTransactionHex(compiled);
      const submitResult = await this.gatewayClient.submitTransaction(txHex);
      
      if (submitResult.duplicate) {
        console.log(`⚠️ Mint NFT transaction ${intentHash} was duplicate - may have been submitted before`);
      }

      console.log(`✅ Minted NFT ${nftData.nftId}: ${intentHash}`);
      return intentHash;
    } catch (error) {
      console.error('Error minting non-fungible tokens:', error);
      throw new Error(`Failed to mint non-fungible tokens: ${error}`);
    }
  }

  /**
   * Transfer NFT between accounts
   */
  public async transferNonFungible(
    resourceAddress: string,
    nftId: string,
    fromAccount: string,
    toAccount: string,
    senderWallet: RadixWallet,
    currentEpoch: number
  ): Promise<string> {
    try {
      const senderPrivateKey = RadixTransactionBuilder.createPrivateKeyFromHex(
        senderWallet.getPrivateKeyHex(),
        'Ed25519'
      );

      // Use try_deposit_batch_or_abort for NFT transfers too
      const manifest = `
        CALL_METHOD
          Address("${fromAccount}")
          "lock_fee"
          Decimal("10");
        
        CALL_METHOD
          Address("${fromAccount}")
          "withdraw_non_fungibles"
          Address("${resourceAddress}")
          Array<NonFungibleLocalId>(
            NonFungibleLocalId("${nftId}")
          );
        
        CALL_METHOD
          Address("${toAccount}")
          "try_deposit_batch_or_abort"
          Expression("ENTIRE_WORKTOP")
          None;
      `;

      const { transaction, compiled } = await this.transactionBuilder.buildCustomManifestTransaction(
        manifest,
        senderPrivateKey,
        currentEpoch,
        `Transfer NFT ${nftId}`
      );

      // Extract intent hash BEFORE submitting for proper tracking
      const intentHashObj = await RadixEngineToolkit.NotarizedTransaction.intentHash(transaction);
      const intentHash = intentHashObj.id;

      const txHex = this.transactionBuilder.getCompiledTransactionHex(compiled);
      const submitResult = await this.gatewayClient.submitTransaction(txHex);
      
      if (submitResult.duplicate) {
        console.log(`⚠️ Transfer NFT transaction ${intentHash} was duplicate - may have been submitted before`);
      }

      console.log(`✅ Transferred NFT ${nftId}: ${intentHash}`);
      return intentHash;
    } catch (error) {
      console.error('Error transferring non-fungible token:', error);
      throw new Error(`Failed to transfer non-fungible token: ${error}`);
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
    return this.transactionBuilder.getXRDResourceAddress()
      .replace('resource', 'package')
      .replace('tknxxxxxxxxxradxrdxxxxxxxxx009923554798', 'xxxxxxxxxresrcexxxxxxxxx000538436477');
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
      // Simplified check - just verify account exists and has some XRD
      return !!balances;
    } catch (error) {
      console.error('Error checking token creation capability:', error);
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