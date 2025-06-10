import { 
  PublicKey, 
  SignatureWithPublicKey,
  Signature 
} from '@radixdlt/radix-engine-toolkit';

/**
 * Represents a transaction intent that is ready to be signed.
 */
export interface SignableTransactionIntent {
  intentHash: string;
  payloadBytes: Uint8Array;
  intent?: any; // Keep reference to original intent if needed
}

/**
 * Represents the result of a signing operation.
 */
export interface SignedTransaction {
  intentHash: string;
  signature: string;
  publicKey: string;
  compiledTransaction: string;
  intentPayload: Uint8Array;
  signatures: SignatureWithPublicKey[];
}
/**
 * Interface for a Radix Wallet - aligned with Agent Kit requirements
 */
export interface RadixWallet {
  /**
   * Gets the public key associated with the wallet.
   * @returns The public key as a string (hex-encoded).
   */
  getPublicKey(): string;

  /**
   * Gets the private key associated with the wallet.
   * @returns The private key as a string (hex-encoded).
   */
  getPrivateKeyHex(): string;

  /**
   * Gets the Radix account address associated with the wallet.
   * @returns The account address string.
   */
  getAddress(): string;

  /**
   * Signs arbitrary data with the wallet's private key.
   * @param data The data to sign.
   * @returns A promise that resolves to the signature as hex string.
   */
  sign(data: Uint8Array): Promise<string>;

  /**
   * Signs a transaction intent.
   * @param transactionIntent The transaction intent to sign.
   * @returns A promise that resolves to the signed transaction details.
   */
  signTransaction(transactionIntent: SignableTransactionIntent): Promise<SignedTransaction>;

  /**
   * Gets the PublicKey object for use with RadixEngineToolkit
   * @returns PublicKey object from the SDK
   */
  getPublicKeyObject(): PublicKey;
}

/**
 * Placeholder interface for a Hardware Wallet.
 */
export interface HardwareWallet extends RadixWallet {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): Promise<boolean>;
}

/**
 * Enhanced Vault-integrated Wallet with proper typing
 */
export class VaultWallet implements RadixWallet {
  private vaultConfig: {
    vaultApiUrl: string;
    token: string;
    keyPath: string;
  };
  private cachedAddress?: string;
  private cachedPublicKey?: string;
  private cachedPublicKeyObject?: PublicKey;

  constructor(vaultConfig: { vaultApiUrl: string; token: string; keyPath: string }) {
    this.vaultConfig = vaultConfig;
    console.log('VaultWallet initialized with key path:', this.vaultConfig.keyPath);
  }

  getPublicKey(): string {
    if (!this.cachedPublicKey) {
      throw new Error('VaultWallet.getPublicKey() not implemented. Call initialize() first.');
    }
    return this.cachedPublicKey;
  }

  getPrivateKeyHex(): string {
    throw new Error('VaultWallet.getPrivateKeyHex() not available - private keys are stored in Vault');
  }

  getAddress(): string {
    if (!this.cachedAddress) {
      throw new Error('VaultWallet.getAddress() not implemented. Call initialize() first.');
    }
    return this.cachedAddress;
  }

  getPublicKeyObject(): PublicKey {
    if (!this.cachedPublicKeyObject) {
      throw new Error('VaultWallet.getPublicKeyObject() not implemented. Call initialize() first.');
    }
    return this.cachedPublicKeyObject;
  }

  async sign(data: Uint8Array): Promise<string> {
    console.warn('VaultWallet.sign() is a placeholder and does not actually call Vault.');
    // TODO: Implement actual Vault signing
    const placeholderSignature = 'vault_signed_' + Buffer.from(data).toString('hex').slice(0, 16);
    return placeholderSignature;
  }

  async signTransaction(transactionIntent: SignableTransactionIntent): Promise<SignedTransaction> {
    console.warn('VaultWallet.signTransaction() is a placeholder and does not actually call Vault.');
    
    const signature = await this.sign(transactionIntent.payloadBytes);
    
    // Create SignatureWithPublicKey using bytes instead of PublicKey object
    const signatureWithPubKey = new SignatureWithPublicKey.Ed25519(
      Buffer.from(signature, 'hex'),
      this.getPublicKeyObject().bytes  // Use .bytes to get Uint8Array
    );

    return {
      intentHash: transactionIntent.intentHash,
      signature: signature,
      publicKey: this.getPublicKey(),
      compiledTransaction: `vault_signed_tx_${Date.now()}`,
      intentPayload: transactionIntent.payloadBytes,
      signatures: [signatureWithPubKey],
    };
  }

  // Method to initialize the wallet with cached values (for testing/development)
  public initialize(publicKey: string, address: string, publicKeyObject?: PublicKey): void {
    this.cachedPublicKey = publicKey;
    this.cachedAddress = address;
    this.cachedPublicKeyObject = publicKeyObject;
  }
}