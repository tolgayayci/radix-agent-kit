import axios from "axios";
import {
  PublicKey,
  SignatureWithPublicKey,
  Signature,
} from "@radixdlt/radix-engine-toolkit";
import {
  RadixWallet,
  SignableTransactionIntent,
  SignedTransaction,
} from "./RadixWallet";

/**
 * VaultWallet Configuration Interface
 */
export interface VaultWalletConfig {
  /** Vault API URL (e.g., 'https://vault.example.com:8200') */
  vaultApiUrl: string;

  /** Vault authentication token */
  token: string;

  /** Path to the transit key in Vault (e.g., 'transit/keys/radix-key') */
  keyPath: string;

  /** Radix account address associated with this key */
  accountAddress: string;

  /** Public key in hex format */
  publicKey: string;
}

/**
 * VaultWallet - A RadixWallet implementation that uses HashiCorp Vault for key management and signing
 *
 * This implementation uses Vault's Transit Secret Engine to securely store and use cryptographic keys
 * without exposing them to the application. All signing operations are performed within Vault.
 *
 * Prerequisites:
 * 1. HashiCorp Vault server with Transit Secret Engine enabled
 * 2. A key created in the Transit engine (Ed25519 type for Radix compatibility)
 * 3. Proper Vault policies to allow signing operations
 *
 * @see https://www.vaultproject.io/docs/secrets/transit
 */
export class VaultWallet implements RadixWallet {
  private config: VaultWalletConfig;
  private cachedPublicKeyObject?: PublicKey;

  /**
   * Creates a new VaultWallet instance
   *
   * @param config Configuration for connecting to Vault and identifying the key
   */
  constructor(config: VaultWalletConfig) {
    this.config = config;

    // Validate configuration
    if (!config.vaultApiUrl) throw new Error("Vault API URL is required");
    if (!config.token) throw new Error("Vault token is required");
    if (!config.keyPath) throw new Error("Vault key path is required");
    if (!config.accountAddress)
      throw new Error("Radix account address is required");
    if (!config.publicKey) throw new Error("Public key is required");

    console.log(
      `VaultWallet initialized with key path: ${this.config.keyPath}`
    );
  }

  /**
   * Gets the public key associated with the wallet
   * @returns The public key as a hex-encoded string
   */
  getPublicKey(): string {
    return this.config.publicKey;
  }

  /**
   * Gets the Radix account address associated with the wallet
   * @returns The account address string
   */
  getAddress(): string {
    return this.config.accountAddress;
  }

  /**
   * Gets the PublicKey object for use with RadixEngineToolkit
   * @returns PublicKey object from the SDK
   */
  getPublicKeyObject(): PublicKey {
    if (!this.cachedPublicKeyObject) {
      // Convert hex string to bytes
      const publicKeyBytes = Buffer.from(this.config.publicKey, "hex");
      this.cachedPublicKeyObject = new PublicKey.Ed25519(publicKeyBytes);
    }
    return this.cachedPublicKeyObject;
  }

  /**
   * Signs data using the key stored in Vault
   *
   * @param data The data to sign
   * @returns A promise that resolves to the signature as a hex string
   */
  async sign(data: Uint8Array): Promise<string> {
    try {
      // Extract key name from path
      const keyName = this.config.keyPath.split("/").pop();
      if (!keyName) {
        throw new Error("Invalid key path format");
      }

      // Prepare the request to Vault's Transit engine
      const url = `${this.config.vaultApiUrl}/v1/transit/sign/${keyName}`;
      const headers = {
        "X-Vault-Token": this.config.token,
        "Content-Type": "application/json",
      };

      // Vault expects base64-encoded input
      const base64Data = Buffer.from(data).toString("base64");

      // Make the signing request to Vault
      const response = await axios.post(
        url,
        {
          input: base64Data,
          // Specify the signing algorithm if needed
          // For Ed25519, no hash algorithm is typically specified as it uses pure EdDSA
        },
        { headers }
      );

      // Extract the signature from the response
      if (!response.data?.data?.signature) {
        throw new Error("Invalid response from Vault: signature not found");
      }

      // Vault returns a signature in format "vault:v1:base64signature"
      const signatureParts = response.data.data.signature.split(":");
      if (signatureParts.length !== 3) {
        throw new Error(
          `Invalid signature format: ${response.data.data.signature}`
        );
      }

      // Decode the base64 signature and convert to hex
      const signatureBytes = Buffer.from(signatureParts[2], "base64");
      return signatureBytes.toString("hex");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // Handle Axios errors with more detail
        const statusCode = error.response?.status;
        const errorMessage = error.response?.data?.errors || error.message;
        throw new Error(
          `Vault signing failed (${statusCode}): ${errorMessage}`
        );
      }
      throw new Error(
        `Vault signing failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Signs a transaction intent using the key stored in Vault
   *
   * @param transactionIntent The transaction intent to sign
   * @returns A promise that resolves to the signed transaction details
   */
  async signTransaction(
    transactionIntent: SignableTransactionIntent
  ): Promise<SignedTransaction> {
    // Sign the transaction intent
    const signature = await this.sign(transactionIntent.payloadBytes);

    // Create a SignatureWithPublicKey object
    const signatureWithPubKey = new SignatureWithPublicKey.Ed25519(
      Buffer.from(signature, "hex"),
      this.getPublicKeyObject().bytes
    );

    // Return the signed transaction
    return {
      intentHash: transactionIntent.intentHash,
      signature: signature,
      publicKey: this.getPublicKey(),
      compiledTransaction: `vault_signed_tx_${transactionIntent.intentHash}`,
      intentPayload: transactionIntent.payloadBytes,
      signatures: [signatureWithPubKey],
    };
  }

  /**
   * Factory method to create a VaultWallet from environment variables
   *
   * @returns A new VaultWallet instance configured from environment variables
   */
  static fromEnvironment(): VaultWallet {
    const vaultApiUrl = process.env.VAULT_API_URL;
    const token = process.env.VAULT_TOKEN;
    const keyPath = process.env.VAULT_KEY_PATH;
    const accountAddress = process.env.RADIX_ACCOUNT_ADDRESS;
    const publicKey = process.env.RADIX_PUBLIC_KEY;

    if (!vaultApiUrl)
      throw new Error("VAULT_API_URL environment variable is required");
    if (!token) throw new Error("VAULT_TOKEN environment variable is required");
    if (!keyPath)
      throw new Error("VAULT_KEY_PATH environment variable is required");
    if (!accountAddress)
      throw new Error("RADIX_ACCOUNT_ADDRESS environment variable is required");
    if (!publicKey)
      throw new Error("RADIX_PUBLIC_KEY environment variable is required");

    return new VaultWallet({
      vaultApiUrl,
      token,
      keyPath,
      accountAddress,
      publicKey,
    });
  }
}

/**
 * Helper function to create a key in Vault for use with VaultWallet
 *
 * @param vaultApiUrl Vault API URL
 * @param token Vault authentication token
 * @param keyName Name for the new key
 * @returns A promise that resolves when the key is created
 */
export async function createVaultKey(
  vaultApiUrl: string,
  token: string,
  keyName: string
): Promise<void> {
  try {
    const url = `${vaultApiUrl}/v1/transit/keys/${keyName}`;
    const headers = {
      "X-Vault-Token": token,
      "Content-Type": "application/json",
    };

    // Create an Ed25519 key (compatible with Radix)
    await axios.post(
      url,
      {
        type: "ed25519",
      },
      { headers }
    );

    console.log(`Created Ed25519 key '${keyName}' in Vault`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status;
      const errorMessage = error.response?.data?.errors || error.message;
      throw new Error(
        `Failed to create Vault key (${statusCode}): ${errorMessage}`
      );
    }
    throw new Error(
      `Failed to create Vault key: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Helper function to export the public key from Vault
 *
 * @param vaultApiUrl Vault API URL
 * @param token Vault authentication token
 * @param keyName Name of the key to export
 * @returns A promise that resolves to the public key in hex format
 */
export async function exportVaultPublicKey(
  vaultApiUrl: string,
  token: string,
  keyName: string
): Promise<string> {
  try {
    const url = `${vaultApiUrl}/v1/transit/keys/${keyName}`;
    const headers = {
      "X-Vault-Token": token,
    };

    const response = await axios.get(url, { headers });

    // Extract the public key from the response
    const publicKey = response.data?.data?.keys?.[0]?.public_key;
    if (!publicKey) {
      throw new Error("Public key not found in Vault response");
    }

    // Vault returns the public key in PEM format, we need to extract the raw bytes
    // This is a simplified example - in a real implementation, you would need to
    // properly parse the PEM format to extract the raw public key bytes
    const pemLines = publicKey.split("\n");
    const base64Key = pemLines.slice(1, -2).join("");
    const keyBytes = Buffer.from(base64Key, "base64");

    return keyBytes.toString("hex");
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status;
      const errorMessage = error.response?.data?.errors || error.message;
      throw new Error(
        `Failed to export public key (${statusCode}): ${errorMessage}`
      );
    }
    throw new Error(
      `Failed to export public key: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
