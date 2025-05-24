import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

/**
 * Interface for secure key storage options
 */
export interface KeyStorageOptions {
  /** Directory to store encrypted keys (defaults to ~/.radix-agent-kit) */
  storageDir?: string;

  /** Custom encryption key or password */
  encryptionKey?: string;

  /** Salt for key derivation (if not provided, a random one will be generated) */
  salt?: Buffer;

  /** Initialization vector for encryption (if not provided, a random one will be generated) */
  iv?: Buffer;
}

/**
 * Interface for stored key data
 */
export interface StoredKeyData {
  /** Key identifier */
  id: string;

  /** Encrypted key data */
  data: string;

  /** Key type (e.g., 'mnemonic', 'privateKey') */
  type: string;

  /** Additional metadata */
  metadata: Record<string, any>;
}

/**
 * Secure Key Storage for Radix Agent Kit
 *
 * This class provides secure storage for sensitive key material using:
 * - AES-256-GCM encryption
 * - PBKDF2 key derivation
 * - Secure file storage with proper permissions
 */
export class SecureKeyStorage {
  private storageDir: string;
  private masterKey: Buffer | null = null;
  private salt: Buffer;
  private defaultIv: Buffer | null = null;
  private encryptionKey: string = "";

  /**
   * Creates a new SecureKeyStorage instance
   *
   * @param options Configuration options for key storage
   */
  constructor(options: KeyStorageOptions = {}) {
    // Set up storage directory
    this.storageDir =
      options.storageDir || path.join(os.homedir(), ".radix-agent-kit", "keys");

    // Ensure storage directory exists with proper permissions
    this.ensureStorageDir();

    // Set up encryption parameters
    this.salt = options.salt || crypto.randomBytes(16);
    this.defaultIv = options.iv || null;

    // If encryption key is provided, derive the master key
    if (options.encryptionKey) {
      this.encryptionKey = options.encryptionKey;
      this.setEncryptionKey(options.encryptionKey);
    }
  }

  /**
   * Ensures the storage directory exists with proper permissions
   */
  private ensureStorageDir(): void {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true, mode: 0o700 });
    }
  }

  /**
   * Sets the encryption key and derives the master key
   *
   * @param encryptionKey The encryption key or password
   */
  public setEncryptionKey(encryptionKey: string): void {
    this.encryptionKey = encryptionKey;

    // Derive a key using PBKDF2
    this.masterKey = crypto.pbkdf2Sync(
      encryptionKey,
      this.salt,
      100000, // High iteration count for security
      32, // 256 bits
      "sha256"
    );
  }

  /**
   * Encrypts sensitive data
   *
   * @param data The data to encrypt
   * @param iv Optional initialization vector (if not provided, a random one will be generated)
   * @returns The encrypted data and the IV used
   */
  private encrypt(
    data: string | Buffer,
    iv?: Buffer
  ): { encryptedData: Buffer; iv: Buffer } {
    if (!this.masterKey) {
      throw new Error("Encryption key not set. Call setEncryptionKey() first.");
    }

    // Convert string data to buffer if needed
    const dataBuffer = typeof data === "string" ? Buffer.from(data) : data;

    // Use provided IV or generate a random one
    const ivToUse = iv || this.defaultIv || crypto.randomBytes(16);

    // Create cipher
    const cipher = crypto.createCipheriv(
      "aes-256-gcm",
      this.masterKey,
      ivToUse
    );

    // Encrypt data
    const encrypted = Buffer.concat([
      cipher.update(dataBuffer),
      cipher.final(),
    ]);

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Return encrypted data with IV and auth tag
    return {
      encryptedData: Buffer.concat([encrypted, authTag]),
      iv: ivToUse,
    };
  }

  /**
   * Decrypts encrypted data
   *
   * @param encryptedData The encrypted data
   * @param key Optional encryption key (if different from the current one)
   * @param iv The initialization vector used for encryption
   * @returns The decrypted data
   */
  private decrypt(encryptedData: Buffer, key?: string, iv?: Buffer): Buffer {
    let masterKeyToUse = this.masterKey;

    // If a different key is provided, derive it
    if (key && key !== this.encryptionKey) {
      masterKeyToUse = crypto.pbkdf2Sync(key, this.salt, 100000, 32, "sha256");
    }

    if (!masterKeyToUse) {
      throw new Error("Encryption key not set. Call setEncryptionKey() first.");
    }

    // Use provided IV or default
    const ivToUse = iv || this.defaultIv;
    if (!ivToUse) {
      throw new Error("IV not provided and no default IV set.");
    }

    // Extract auth tag (last 16 bytes)
    const authTag = encryptedData.slice(encryptedData.length - 16);
    const ciphertext = encryptedData.slice(0, encryptedData.length - 16);

    // Create decipher
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      masterKeyToUse,
      ivToUse
    );
    decipher.setAuthTag(authTag);

    // Decrypt data
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }

  /**
   * Stores a key securely
   *
   * @param id Unique identifier for the key
   * @param data The sensitive data to store (mnemonic, private key, etc.)
   * @param type The type of key being stored
   * @param metadata Additional metadata to store with the key
   * @returns The ID of the stored key
   */
  public storeKey(
    id: string,
    data: string | Buffer,
    type: string,
    metadata: Record<string, any> = {}
  ): string {
    // Encrypt the data
    const { encryptedData, iv } = this.encrypt(data);

    // Prepare the key data
    const keyData = {
      id,
      data: encryptedData.toString("base64"),
      iv: iv.toString("base64"),
      salt: this.salt.toString("base64"),
      type,
      metadata,
    };

    // Write to file
    const filePath = path.join(this.storageDir, `${id}.key`);
    fs.writeFileSync(filePath, JSON.stringify(keyData), { mode: 0o600 });

    return id;
  }

  /**
   * Retrieves a stored key
   *
   * @param id The ID of the key to retrieve
   * @returns The decrypted key data
   */
  public retrieveKey(id: string): {
    data: Buffer;
    type: string;
    metadata: Record<string, any>;
  } {
    // Read from file
    const filePath = path.join(this.storageDir, `${id}.key`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Key with ID ${id} not found`);
    }

    // Parse stored data
    const fileData = JSON.parse(fs.readFileSync(filePath, "utf8"));

    // Decrypt the data
    const decryptedData = this.decrypt(
      Buffer.from(fileData.data, "base64"),
      undefined,
      Buffer.from(fileData.iv, "base64")
    );

    return {
      data: decryptedData,
      type: fileData.type,
      metadata: fileData.metadata,
    };
  }

  /**
   * Lists all stored keys
   *
   * @returns Array of key IDs and their metadata
   */
  public listKeys(): Array<{
    id: string;
    type: string;
    metadata: Record<string, any>;
  }> {
    // Ensure directory exists
    this.ensureStorageDir();

    // Read directory
    const files = fs
      .readdirSync(this.storageDir)
      .filter((file) => file.endsWith(".key"));

    // Extract key info
    return files.map((file) => {
      const filePath = path.join(this.storageDir, file);
      const fileData = JSON.parse(fs.readFileSync(filePath, "utf8"));

      return {
        id: fileData.id,
        type: fileData.type,
        metadata: fileData.metadata,
      };
    });
  }

  /**
   * Deletes a stored key
   *
   * @param id The ID of the key to delete
   */
  public deleteKey(id: string): void {
    const filePath = path.join(this.storageDir, `${id}.key`);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    } else {
      throw new Error(`Key with ID ${id} not found`);
    }
  }

  /**
   * Changes the encryption key for all stored keys
   *
   * @param newEncryptionKey The new encryption key
   */
  public changeEncryptionKey(newEncryptionKey: string): void {
    if (!this.masterKey) {
      throw new Error(
        "Current encryption key not set. Call setEncryptionKey() first."
      );
    }

    // Get all keys
    const keys = this.listKeys();
    const oldEncryptionKey = this.encryptionKey;

    // Update the encryption key
    this.setEncryptionKey(newEncryptionKey);

    // Re-encrypt all keys with the new master key
    for (const keyInfo of keys) {
      // Read with old key
      const keyPath = path.join(this.storageDir, `${keyInfo.id}.key`);
      const fileData = JSON.parse(fs.readFileSync(keyPath, "utf8"));

      // Decrypt with old key
      const decrypted = this.decrypt(
        Buffer.from(fileData.data, "base64"),
        oldEncryptionKey,
        Buffer.from(fileData.iv, "base64")
      );

      // Store with new key
      this.storeKey(keyInfo.id, decrypted, keyInfo.type, keyInfo.metadata);
    }
  }
}

/**
 * Creates a secure key storage instance with a password
 *
 * @param password The password to use for encryption
 * @param options Additional options for key storage
 * @returns A configured SecureKeyStorage instance
 */
export function createSecureKeyStorage(
  password: string,
  options: KeyStorageOptions = {}
): SecureKeyStorage {
  const storage = new SecureKeyStorage(options);
  storage.setEncryptionKey(password);
  return storage;
}
