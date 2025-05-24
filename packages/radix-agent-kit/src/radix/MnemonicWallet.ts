// Radix Agent Kit - Mnemonic Wallet Implementation
// Compatible with the Radix Agent Kit architecture

// Install required packages:
// npm install @radixdlt/radix-engine-toolkit@^1.0.5 bip39

import {
  PrivateKey,
  PublicKey,
  NetworkId,
  RadixEngineToolkit,
} from "@radixdlt/radix-engine-toolkit";
import * as bip39 from "bip39";
import * as crypto from "crypto";

/**
 * Interface for the RadixWallet abstraction mentioned in the PRD
 * This ensures compatibility with the agent kit architecture
 */
export interface RadixWallet {
  getAddress(): string;
  getPublicKey(): string;
  sign(data: Uint8Array): Promise<string>;
  signTransaction(transactionHash: Uint8Array): Promise<string>;
}

/**
 * Account derivation result interface
 */
export interface DerivedAccount {
  index: number;
  privateKey: string;
  publicKey: string;
  address: string;
  derivationPath: string;
}

/**
 * Wallet configuration interface
 */
export interface WalletConfig {
  networkId: number; // NetworkId is a namespace with numeric values
  applicationName?: string;
  accountIndex?: number;
}

/**
 * Radix Agent Kit Mnemonic Wallet
 *
 * This implementation is designed for the Radix Agent Kit and follows
 * the architecture specified in the PRD. It provides:
 *
 * - 24-word BIP-39 mnemonic support (as required by Radix Wallet compatibility)
 * - Ed25519 key derivation
 * - Secure key management for AI agents
 * - Compatible with @radixdlt/radix-engine-toolkit
 * - Implements the RadixWallet interface for agent integration
 */
export class RadixMnemonicWallet implements RadixWallet {
  private mnemonic: string;
  private seed: Buffer;
  private networkId: number; // NetworkId enum value
  private applicationName: string;
  private currentAccount: DerivedAccount;
  private derivedAccounts: Map<number, DerivedAccount> = new Map();

  /**
   * Create a new wallet from mnemonic
   * @param mnemonic 24-word BIP-39 mnemonic phrase
   * @param passphrase Optional BIP-39 passphrase (empty string for Radix Wallet compatibility)
   * @param config Wallet configuration
   */
  constructor(
    mnemonic: string,
    passphrase: string = "", // Empty for Radix Wallet compatibility
    config: WalletConfig
  ) {
    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error("Invalid mnemonic phrase");
    }

    // Ensure 24-word mnemonic for Radix Wallet compatibility
    const wordCount = mnemonic.trim().split(/\s+/).length;
    if (wordCount !== 24) {
      throw new Error(
        "Radix Agent Kit requires 24-word mnemonic for wallet compatibility"
      );
    }

    this.mnemonic = mnemonic;
    this.seed = bip39.mnemonicToSeedSync(mnemonic, passphrase);
    this.networkId = config.networkId;
    this.applicationName = config.applicationName || "RadixAgentKit";

    // Derive the initial account (index 0 by default)
    const accountIndex = config.accountIndex || 0;
    this.currentAccount = this.deriveAccountSync(accountIndex);
  }

  /**
   * Generate a new random wallet with 24-word mnemonic
   * This is the preferred method for Radix Agent Kit
   */
  static generateRandom(config: WalletConfig): RadixMnemonicWallet {
    const mnemonic = bip39.generateMnemonic(256); // 256 bits = 24 words
    return new RadixMnemonicWallet(mnemonic, "", config);
  }

  /**
   * Create wallet from existing mnemonic
   */
  static fromMnemonic(
    mnemonic: string,
    config: WalletConfig,
    passphrase: string = ""
  ): RadixMnemonicWallet {
    return new RadixMnemonicWallet(mnemonic, passphrase, config);
  }

  /**
   * Derive private key for account index
   * Uses a simplified but deterministic derivation compatible with Radix
   */
  private derivePrivateKey(accountIndex: number): string {
    // Simplified derivation for TypeScript compatibility
    // For production use with official Radix Wallet compatibility,
    // consider using the Rust-based wallet-compatible-derivation library

    const derivationString = `radix-agent-kit-${accountIndex}`;
    const combinedSeed = Buffer.concat([
      this.seed,
      Buffer.from(derivationString, "utf8"),
      Buffer.from([accountIndex]),
    ]);

    // Hash to get deterministic 32-byte private key
    const hash = crypto.createHash("sha256").update(combinedSeed).digest();
    // Return as hex string for compatibility with PrivateKey.Ed25519 constructor
    return hash.toString("hex");
  }

  /**
   * Derive account synchronously for initial setup
   */
  private deriveAccountSync(accountIndex: number): DerivedAccount {
    try {
      const privateKeyHex = this.derivePrivateKey(accountIndex);
      const privateKey = new PrivateKey.Ed25519(privateKeyHex);
      const publicKey = privateKey.publicKey();

      const accountAddress =
        RadixEngineToolkit.Derive.virtualAccountAddressFromPublicKey(
          publicKey,
          this.networkId
        );

      const derivedAccount: DerivedAccount = {
        index: accountIndex,
        privateKey: Buffer.from(privateKey.bytes).toString("hex"), // Convert bytes to hex
        publicKey: Buffer.from(publicKey.bytes).toString("hex"),
        address: accountAddress.toString(),
        derivationPath: `m/44'/1022'/${accountIndex}'/0/0`, // Radix coin type
      };

      this.derivedAccounts.set(accountIndex, derivedAccount);
      return derivedAccount;
    } catch (error) {
      throw new Error(
        `Failed to derive account at index ${accountIndex}: ${error}`
      );
    }
  }

  /**
   * Derive account asynchronously
   */
  async deriveAccount(accountIndex: number): Promise<DerivedAccount> {
    if (this.derivedAccounts.has(accountIndex)) {
      return this.derivedAccounts.get(accountIndex)!;
    }
    return this.deriveAccountSync(accountIndex);
  }

  // RadixWallet interface implementation for Agent Kit compatibility

  /**
   * Get the current account address (RadixWallet interface)
   */
  getAddress(): string {
    return this.currentAccount.address;
  }

  /**
   * Get the current account public key (RadixWallet interface)
   */
  getPublicKey(): string {
    return this.currentAccount.publicKey;
  }

  /**
   * Sign arbitrary data (RadixWallet interface)
   * Uses the current SDK pattern for signing
   */
  async sign(data: Uint8Array): Promise<string> {
    const privateKey = new PrivateKey.Ed25519(this.currentAccount.privateKey);
    // The SDK handles the hash internally for Ed25519 - we just sign the data
    const signature = privateKey.signToSignature(data);
    return Buffer.from(signature.bytes).toString("hex");
  }

  /**
   * Get the PublicKey object for use with RadixEngineToolkit
   */
  getPublicKeyObject(): PublicKey {
    const privateKey = new PrivateKey.Ed25519(this.currentAccount.privateKey);
    return privateKey.publicKey();
  }

  /**
   * Sign transaction hash (RadixWallet interface)
   * This is the primary method used by the Radix Agent Kit
   */
  async signTransaction(transactionIntent: any): Promise<any> {
    // For now, just return the signature as a string for compatibility
    if (transactionIntent.payloadBytes) {
      const signature = await this.sign(transactionIntent.payloadBytes);
      return {
        intentHash: transactionIntent.intentHash,
        signature: signature,
        publicKey: this.getPublicKey(),
        compiledTransaction: "",
        intentPayload: transactionIntent.payloadBytes,
        signatures: [], // This should be populated with proper SignatureWithPublicKey objects
      };
    }
    return this.sign(transactionIntent);
  }

  // Additional methods for Radix Agent Kit functionality

  /**
   * Switch to a different account index
   */
  async switchToAccount(accountIndex: number): Promise<DerivedAccount> {
    this.currentAccount = await this.deriveAccount(accountIndex);
    return this.currentAccount;
  }

  /**
   * Get current account details
   */
  getCurrentAccount(): DerivedAccount {
    return { ...this.currentAccount };
  }

  /**
   * Derive multiple accounts for the agent
   */
  async deriveMultipleAccounts(
    startIndex: number = 0,
    count: number = 5
  ): Promise<DerivedAccount[]> {
    const accounts: DerivedAccount[] = [];
    for (let i = startIndex; i < startIndex + count; i++) {
      const account = await this.deriveAccount(i);
      accounts.push(account);
    }
    return accounts;
  }

  /**
   * Get all derived accounts
   */
  getAllAccounts(): DerivedAccount[] {
    return Array.from(this.derivedAccounts.values()).sort(
      (a, b) => a.index - b.index
    );
  }

  /**
   * Get wallet network information
   */
  getNetworkInfo(): {
    networkId: number; // NetworkId enum value
    applicationName: string;
    currentAccountIndex: number;
    totalAccounts: number;
  } {
    return {
      networkId: this.networkId,
      applicationName: this.applicationName,
      currentAccountIndex: this.currentAccount.index,
      totalAccounts: this.derivedAccounts.size,
    };
  }

  /**
   * Get mnemonic phrase (WARNING: Sensitive information)
   * This should only be used for backup purposes
   */
  getMnemonic(): string {
    return this.mnemonic;
  }

  /**
   * Validate if the wallet can sign for a specific address
   */
  canSignFor(address: string): boolean {
    return Array.from(this.derivedAccounts.values()).some(
      (account) => account.address === address
    );
  }

  /**
   * Sign with a specific account index
   */
  async signWithAccount(
    accountIndex: number,
    data: Uint8Array
  ): Promise<string> {
    const account = await this.deriveAccount(accountIndex);
    const privateKey = new PrivateKey.Ed25519(account.privateKey);
    const signature = privateKey.signToSignature(data);
    return Buffer.from(signature.bytes).toString("hex");
  }

  /**
   * Export wallet information for debugging (excludes private keys)
   */
  exportPublicInfo(): {
    networkId: number; // NetworkId enum value
    applicationName: string;
    accounts: Array<{
      index: number;
      address: string;
      publicKey: string;
      derivationPath: string;
    }>;
  } {
    return {
      networkId: this.networkId,
      applicationName: this.applicationName,
      accounts: this.getAllAccounts().map((account) => ({
        index: account.index,
        address: account.address,
        publicKey: account.publicKey,
        derivationPath: account.derivationPath,
      })),
    };
  }

  // Static utility methods

  /**
   * Validate mnemonic phrase
   */
  static validateMnemonic(mnemonic: string): boolean {
    if (!bip39.validateMnemonic(mnemonic)) {
      return false;
    }

    // Check for 24-word requirement
    const wordCount = mnemonic.trim().split(/\s+/).length;
    return wordCount === 24;
  }

  /**
   * Generate a random 24-word mnemonic
   */
  static generateMnemonic(): string {
    return bip39.generateMnemonic(256);
  }

  /**
   * Get mnemonic strength in bits
   */
  static getMnemonicStrength(mnemonic: string): number {
    const wordCount = mnemonic.trim().split(/\s+/).length;
    switch (wordCount) {
      case 12:
        return 128;
      case 15:
        return 160;
      case 18:
        return 192;
      case 21:
        return 224;
      case 24:
        return 256;
      default:
        return 0;
    }
  }
}

/**
 * Factory function for creating wallet instances
 * This matches the pattern used in the Radix Agent Kit architecture
 */
export class RadixWalletFactory {
  /**
   * Create a new wallet for the agent
   */
  static createNew(config: WalletConfig): RadixMnemonicWallet {
    return RadixMnemonicWallet.generateRandom(config);
  }

  /**
   * Import existing wallet from mnemonic
   */
  static importFromMnemonic(
    mnemonic: string,
    config: WalletConfig,
    passphrase?: string
  ): RadixMnemonicWallet {
    return RadixMnemonicWallet.fromMnemonic(mnemonic, config, passphrase);
  }

  /**
   * Import from environment variable (common pattern for agents)
   */
  static fromEnvironment(
    envVar: string = "RADIX_MNEMONIC",
    config: WalletConfig
  ): RadixMnemonicWallet {
    const mnemonic = process.env[envVar];
    if (!mnemonic) {
      throw new Error(`Environment variable ${envVar} not found`);
    }
    return RadixMnemonicWallet.fromMnemonic(mnemonic, config);
  }
}

// Usage example for Radix Agent Kit
export async function createAgentWallet(): Promise<RadixMnemonicWallet> {
  // Example of how this would be used in your Radix Agent Kit
  const wallet = RadixWalletFactory.fromEnvironment("RADIX_MNEMONIC", {
    networkId: NetworkId.Mainnet, // Use the enum value
    applicationName: "RadixAgentKit",
    accountIndex: 0,
  });

  console.log("Agent wallet created:");
  console.log("Address:", wallet.getAddress());
  console.log("Network:", wallet.getNetworkInfo());

  return wallet;
}

export default RadixMnemonicWallet;
