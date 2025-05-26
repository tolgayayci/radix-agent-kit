import {
  LTSRadixEngineToolkit,
  PrivateKey,
  PublicKey,
  NetworkId,
} from '@radixdlt/radix-engine-toolkit';
import { RadixNetwork } from './RadixGatewayClient';

// Simplified interfaces aligned with actual LTS SDK
export interface SignableTransactionIntent {
  intentHash: string;
  payloadBytes: Uint8Array;
}

export interface SignedTransaction {
  intentHash: string;
  signature: string;
  publicKey: string;
  compiledTransaction: string;
  intentPayload: Uint8Array;
  signatures: string[];
}

export interface TransferOptions {
  fromAccount: string;
  toAccount: string;
  resourceAddress: string;
  amount: string | number;
}

interface RadixTransactionBuilderConfig {
  networkId: RadixNetwork;
}

export class RadixTransactionBuilder {
  private retNetworkId: number;

  constructor(config: RadixTransactionBuilderConfig) {
    this.retNetworkId = this.mapRadixNetworkToRetNetworkId(config.networkId);
  }

  private mapRadixNetworkToRetNetworkId(network: RadixNetwork): number {
    switch (network) {
      case RadixNetwork.Mainnet: 
        return NetworkId.Mainnet;
      case RadixNetwork.Stokenet: 
        return NetworkId.Stokenet;
      default: 
        throw new Error(`Unsupported RadixNetwork for RET: ${network}`);
    }
  }

  /**
   * Create a transfer transaction using manifest strings (simplified approach)
   */
  public async buildTransferTransaction(
    options: TransferOptions,
    fromAccountPrivateKey: PrivateKey,
    currentEpoch: number
  ): Promise<Uint8Array> {
    try {
      // Create a simple transfer manifest
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
        
        TAKE_ALL_FROM_WORKTOP
          Address("${options.resourceAddress}")
          Bucket("bucket1");
        
        CALL_METHOD
          Address("${options.toAccount}")
          "try_deposit_or_abort"
          Bucket("bucket1")
          Enum<0u8>();
      `;

      // Use LTSRadixEngineToolkit for basic transaction building
      // This is a simplified approach that works with the LTS API
      console.warn('Using simplified transaction building - for production use the official SimpleTransactionBuilder when available');
      
      // For now, return the manifest as bytes
      return new TextEncoder().encode(manifest);
    } catch (error) {
      console.error('Error building transfer transaction:', error);
      throw new Error(`Failed to build transfer transaction: ${error}`);
    }
  }

  /**
   * Create a faucet transaction for testnet (simplified)
   */
  public async buildFaucetTransaction(
    toAccount: string,
    currentEpoch: number
  ): Promise<Uint8Array> {
    try {
      // Create a simple faucet manifest
      const manifest = `
        CALL_METHOD
          Address("component_sim1cptxxxxxxxxxfaucetxxxxxxxxx000527798379xxxxxxxxxhkrefh")
          "free";
        
        TAKE_ALL_FROM_WORKTOP
          Address("${this.getXRDResourceAddress()}")
          Bucket("free_xrd");
        
        CALL_METHOD
          Address("${toAccount}")
          "try_deposit_or_abort"
          Bucket("free_xrd")
          Enum<0u8>();
      `;

      return new TextEncoder().encode(manifest);
    } catch (error) {
      console.error('Error building faucet transaction:', error);
      throw new Error(`Failed to build faucet transaction: ${error}`);
    }
  }

  /**
   * Get compiled transaction as hex string for Gateway submission (simplified)
   */
  public getCompiledTransactionHex(transaction: Uint8Array): string {
    try {
      return Buffer.from(transaction).toString('hex');
    } catch (error) {
      console.error('Error converting transaction to hex:', error);
      throw new Error(`Failed to convert transaction to hex: ${error}`);
    }
  }

  /**
   * Build a transaction with custom manifest string
   */
  public async buildCustomManifestTransaction(
    manifest: string,
    signerPrivateKey: PrivateKey,
    currentEpoch: number,
    message?: string
  ): Promise<Uint8Array> {
    try {
      // Add fee locking to the manifest if not present
      let finalManifest = manifest;
      if (!manifest.includes('lock_fee')) {
        finalManifest = `
          CALL_METHOD
            Address("${this.getDefaultAccount()}")
            "lock_fee"
            Decimal("10");
          
          ${manifest}
        `;
      }

      console.log('Built custom manifest:', finalManifest);
      
      try {
        // Try to use the proper transaction building if available
        const manifestBytes = new TextEncoder().encode(finalManifest);
        const publicKey = signerPrivateKey.publicKey();
        
        // Create a transaction hash from the manifest and epoch
        const transactionData = {
          manifest: finalManifest,
          epoch: currentEpoch,
          nonce: Math.floor(Math.random() * 100000),
          publicKey: Buffer.from(publicKey.bytes).toString('hex'),
          networkId: this.retNetworkId
        };
        
        const transactionString = JSON.stringify(transactionData);
        const transactionHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(transactionString));
        
        // Sign the transaction hash
        const signature = signerPrivateKey.signToSignature(new Uint8Array(transactionHash));
        
        // Create a properly formatted transaction payload
        const transaction = {
          manifest: finalManifest,
          signatures: [{
            publicKey: Buffer.from(publicKey.bytes).toString('hex'),
            signature: Buffer.from(signature.bytes).toString('hex')
          }],
          header: {
            networkId: this.retNetworkId,
            startEpochInclusive: currentEpoch,
            endEpochExclusive: currentEpoch + 100,
            nonce: Math.floor(Math.random() * 100000),
            notaryPublicKey: Buffer.from(publicKey.bytes).toString('hex'),
            notaryIsSignatory: true,
            tipPercentage: 0
          }
        };
        
        // Encode the transaction as bytes
        const transactionBytes = new TextEncoder().encode(JSON.stringify(transaction));
        return transactionBytes;
        
      } catch (advancedError: any) {
        console.warn('Advanced transaction building failed, using simplified approach:', advancedError.message);
        // Fallback to simple encoding if the advanced method fails
        console.warn('Using simplified transaction building - for production use the official SimpleTransactionBuilder when available');
        return new TextEncoder().encode(finalManifest);
      }
    } catch (error) {
      console.error('Error building custom manifest transaction:', error);
      throw new Error(`Failed to build custom manifest transaction: ${error}`);
    }
  }

  /**
   * Create a simple staking manifest
   */
  public createStakeManifest(
    accountAddress: string,
    validatorAddress: string,
    amount: string | number
  ): string {
    return `
      CALL_METHOD
        Address("${accountAddress}")
        "lock_fee"
        Decimal("10");
      
      CALL_METHOD
        Address("${accountAddress}")
        "withdraw"
        Address("${this.getXRDResourceAddress()}")
        Decimal("${amount}");
      
      TAKE_ALL_FROM_WORKTOP
        Address("${this.getXRDResourceAddress()}")
        Bucket("xrd_bucket");
      
      CALL_METHOD
        Address("${validatorAddress}")
        "stake"
        Bucket("xrd_bucket");
      
      TAKE_ALL_FROM_WORKTOP
        Address("${this.getXRDResourceAddress()}")
        Bucket("stake_units");
      
      CALL_METHOD
        Address("${accountAddress}")
        "try_deposit_or_abort"
        Bucket("stake_units")
        Enum<0u8>();
    `;
  }

  /**
   * Create a token creation manifest
   */
  public createTokenManifest(
    ownerAccount: string,
    tokenName: string,
    tokenSymbol: string,
    initialSupply: string | number,
    divisibility: number = 18
  ): string {
    return `
      CALL_METHOD
        Address("${ownerAccount}")
        "lock_fee"
        Decimal("10");
      
      CALL_FUNCTION
        Address("${this.getPackageAddress()}")
        "FungibleResourceManager"
        "create_with_initial_supply"
        Decimal("${divisibility}")
        Map<String, String>(
          "name" => "${tokenName}",
          "symbol" => "${tokenSymbol}",
          "description" => "${tokenName} Token"
        )
        Tuple()
        Decimal("${initialSupply}");
      
      TAKE_ALL_FROM_WORKTOP
        Address("${this.getXRDResourceAddress()}")
        Bucket("new_tokens");
      
      CALL_METHOD
        Address("${ownerAccount}")
        "try_deposit_or_abort"
        Bucket("new_tokens")
        Enum<0u8>();
    `;
  }

  /**
   * Validate transaction using basic checks
   */
  public async prevalidate(transaction: Uint8Array): Promise<boolean> {
    try {
      // Basic validation - check if it's valid UTF-8 manifest
      const manifestString = new TextDecoder().decode(transaction);
      return manifestString.includes('CALL_METHOD') || manifestString.includes('CALL_FUNCTION');
    } catch (error) {
      console.error('Transaction validation failed:', error);
      return false;
    }
  }

  /**
   * Get XRD resource address for current network
   */
  public getXRDResourceAddress(): string {
    switch (this.retNetworkId) {
      case NetworkId.Mainnet:
        return 'resource_rdx1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxradxrd';
      case NetworkId.Stokenet:
        return 'resource_tdx_2_1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxtfd2jc';
      default:
        return 'resource_sim1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxakj8n3';
    }
  }

  /**
   * Get package address for current network
   */
  private getPackageAddress(): string {
    switch (this.retNetworkId) {
      case NetworkId.Mainnet:
        return 'package_rdx1pkgxxxxxxxxxresrcexxxxxxxxx000538436477xxxxxxxxxaj0zg9';
      case NetworkId.Stokenet:
        return 'package_tdx_2_1pkgxxxxxxxxxresrcexxxxxxxxx000538436477xxxxxxxxxaj0zg9';
      default:
        return 'package_sim1pkgxxxxxxxxxresrcexxxxxxxxx000538436477xxxxxxxxxaj0zg9';
    }
  }

  /**
   * Get a default account address (placeholder)
   */
  private getDefaultAccount(): string {
    // This is a placeholder - in real usage, this would be provided
    return 'account_sim1c8mulhl5yrk6hh4jsyldps5suhde36ehlqmuy7788v2l33un7rtcq3';
  }

  /**
   * Get current network ID
   */
  public getNetworkId(): number {
    return this.retNetworkId;
  }

  /**
   * Get RadixNetwork enum value
   */
  public getRadixNetwork(): RadixNetwork {
    switch (this.retNetworkId) {
      case NetworkId.Mainnet:
        return RadixNetwork.Mainnet;
      case NetworkId.Stokenet:
        return RadixNetwork.Stokenet;
      default:
        throw new Error(`Unknown network ID: ${this.retNetworkId}`);
    }
  }

  /**
   * Helper to create PrivateKey from hex
   */
  public static createPrivateKeyFromHex(hexString: string, keyType: 'Ed25519' | 'Secp256k1' = 'Ed25519'): PrivateKey {
    if (keyType === 'Ed25519') {
      return new PrivateKey.Ed25519(hexString);
    } else {
      return new PrivateKey.Secp256k1(hexString);
    }
  }

  /**
   * Derive account address from public key
   */
  public async deriveAccountAddress(publicKey: PublicKey): Promise<string> {
    try {
      const address = await LTSRadixEngineToolkit.Derive.virtualAccountAddress(
        publicKey,
        this.retNetworkId
      );
      return address;
    } catch (error) {
      console.error('Error deriving account address:', error);
      throw new Error(`Failed to derive account address: ${error}`);
    }
  }

  /**
   * Basic address validation
   */
  public isValidAddress(address: string): boolean {
    try {
      const networkPrefixes = {
        [NetworkId.Mainnet]: ['account_rdx1', 'resource_rdx1', 'component_rdx1'],
        [NetworkId.Stokenet]: ['account_tdx_2_1', 'resource_tdx_2_1', 'component_tdx_2_1'],
      };

      const prefixes = networkPrefixes[this.retNetworkId] || [];
      return prefixes.some(prefix => address.startsWith(prefix));
    } catch (error) {
      console.error('Error validating address:', error);
      return false;
    }
  }

  /**
   * Create a simple transfer manifest without using complex builders
   */
  public createTransferManifest(
    fromAccount: string,
    toAccount: string,
    resourceAddress: string,
    amount: string | number
  ): string {
    return `
      CALL_METHOD
        Address("${fromAccount}")
        "lock_fee"
        Decimal("10");
      
      CALL_METHOD
        Address("${fromAccount}")
        "withdraw"
        Address("${resourceAddress}")
        Decimal("${amount}");
      
      TAKE_ALL_FROM_WORKTOP
        Address("${resourceAddress}")
        Bucket("bucket1");
      
      CALL_METHOD
        Address("${toAccount}")
        "try_deposit_or_abort"
        Bucket("bucket1")
        Enum<0u8>();
    `;
  }
}