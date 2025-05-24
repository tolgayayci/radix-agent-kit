import { SignableTransactionIntent } from "../radix/RadixWallet";

/**
 * Transaction validation options
 */
export interface TransactionValidationOptions {
  /** Maximum transaction amount (in XRD) */
  maxAmount?: number;

  /** Whitelist of allowed destination addresses */
  allowedDestinations?: string[];

  /** Blacklist of forbidden destination addresses */
  forbiddenDestinations?: string[];

  /** Whether to allow resource creation */
  allowResourceCreation?: boolean;

  /** Whether to allow component calls */
  allowComponentCalls?: boolean;

  /** Maximum number of actions in a single transaction */
  maxActionsPerTransaction?: number;
}

/**
 * Rate limiting options
 */
export interface RateLimitOptions {
  /** Maximum number of transactions per time window */
  maxTransactions: number;

  /** Time window in milliseconds */
  timeWindowMs: number;

  /** Whether to throw an error when rate limit is exceeded (true) or just return false (false) */
  throwOnLimit?: boolean;
}

/**
 * Transaction validation result
 */
export interface ValidationResult {
  /** Whether the transaction is valid */
  valid: boolean;

  /** Reason for validation failure (if any) */
  reason?: string;
}

/**
 * Transaction security manager for Radix Agent Kit
 *
 * This class provides transaction validation and rate limiting to ensure
 * secure operation of AI agents interacting with the Radix blockchain.
 */
export class TransactionSecurity {
  private validationOptions: TransactionValidationOptions;
  private rateLimitOptions?: RateLimitOptions;
  private transactionHistory: { timestamp: number }[] = [];

  /**
   * Creates a new TransactionSecurity instance
   *
   * @param validationOptions Options for transaction validation
   * @param rateLimitOptions Options for rate limiting
   */
  constructor(
    validationOptions: TransactionValidationOptions = {},
    rateLimitOptions?: RateLimitOptions
  ) {
    this.validationOptions = {
      maxAmount: validationOptions.maxAmount || Infinity,
      allowedDestinations: validationOptions.allowedDestinations || [],
      forbiddenDestinations: validationOptions.forbiddenDestinations || [],
      allowResourceCreation:
        validationOptions.allowResourceCreation !== undefined
          ? validationOptions.allowResourceCreation
          : true,
      allowComponentCalls:
        validationOptions.allowComponentCalls !== undefined
          ? validationOptions.allowComponentCalls
          : true,
      maxActionsPerTransaction:
        validationOptions.maxActionsPerTransaction || 10,
    };

    this.rateLimitOptions = rateLimitOptions;
  }

  /**
   * Validates a transaction against security rules
   *
   * @param transaction The transaction to validate
   * @param metadata Additional metadata about the transaction
   * @returns Validation result
   */
  public validateTransaction(
    transaction: SignableTransactionIntent,
    metadata: {
      totalAmount?: number;
      destinations?: string[];
      hasResourceCreation?: boolean;
      hasComponentCalls?: boolean;
      actionCount?: number;
    } = {}
  ): ValidationResult {
    // Check amount limit
    if (
      metadata.totalAmount !== undefined &&
      metadata.totalAmount > this.validationOptions.maxAmount!
    ) {
      return {
        valid: false,
        reason: `Transaction amount ${metadata.totalAmount} exceeds maximum allowed ${this.validationOptions.maxAmount}`,
      };
    }

    // Check destination whitelist (if specified)
    if (
      this.validationOptions.allowedDestinations!.length > 0 &&
      metadata.destinations &&
      metadata.destinations.length > 0
    ) {
      const invalidDestinations = metadata.destinations.filter(
        (dest) => !this.validationOptions.allowedDestinations!.includes(dest)
      );

      if (invalidDestinations.length > 0) {
        return {
          valid: false,
          reason: `Destinations not in whitelist: ${invalidDestinations.join(
            ", "
          )}`,
        };
      }
    }

    // Check destination blacklist
    if (metadata.destinations && metadata.destinations.length > 0) {
      const blacklistedDestinations = metadata.destinations.filter((dest) =>
        this.validationOptions.forbiddenDestinations!.includes(dest)
      );

      if (blacklistedDestinations.length > 0) {
        return {
          valid: false,
          reason: `Blacklisted destinations: ${blacklistedDestinations.join(
            ", "
          )}`,
        };
      }
    }

    // Check resource creation permission
    if (
      metadata.hasResourceCreation &&
      !this.validationOptions.allowResourceCreation
    ) {
      return {
        valid: false,
        reason: "Resource creation is not allowed",
      };
    }

    // Check component calls permission
    if (
      metadata.hasComponentCalls &&
      !this.validationOptions.allowComponentCalls
    ) {
      return {
        valid: false,
        reason: "Component calls are not allowed",
      };
    }

    // Check action count
    if (
      metadata.actionCount !== undefined &&
      metadata.actionCount > this.validationOptions.maxActionsPerTransaction!
    ) {
      return {
        valid: false,
        reason: `Transaction has ${metadata.actionCount} actions, exceeding maximum allowed ${this.validationOptions.maxActionsPerTransaction}`,
      };
    }

    // All checks passed
    return { valid: true };
  }

  /**
   * Checks if a new transaction would exceed rate limits
   *
   * @returns Whether the transaction is allowed under rate limits
   * @throws Error if rate limit is exceeded and throwOnLimit is true
   */
  public checkRateLimit(): boolean {
    if (!this.rateLimitOptions) {
      // Rate limiting not configured
      return true;
    }

    const now = Date.now();
    const windowStart = now - this.rateLimitOptions.timeWindowMs;

    // Clean up old entries
    this.transactionHistory = this.transactionHistory.filter(
      (tx) => tx.timestamp >= windowStart
    );

    // Check if limit is exceeded
    if (
      this.transactionHistory.length >= this.rateLimitOptions.maxTransactions
    ) {
      if (this.rateLimitOptions.throwOnLimit) {
        throw new Error(
          `Rate limit exceeded: ${this.rateLimitOptions.maxTransactions} transactions per ${this.rateLimitOptions.timeWindowMs}ms`
        );
      }
      return false;
    }

    // Record this transaction
    this.transactionHistory.push({ timestamp: now });
    return true;
  }

  /**
   * Validates a transaction and checks rate limits
   *
   * @param transaction The transaction to validate
   * @param metadata Additional metadata about the transaction
   * @returns Validation result
   */
  public validateAndCheckRateLimit(
    transaction: SignableTransactionIntent,
    metadata: {
      totalAmount?: number;
      destinations?: string[];
      hasResourceCreation?: boolean;
      hasComponentCalls?: boolean;
      actionCount?: number;
    } = {}
  ): ValidationResult {
    // First validate the transaction
    const validationResult = this.validateTransaction(transaction, metadata);
    if (!validationResult.valid) {
      return validationResult;
    }

    // Then check rate limits
    try {
      const withinRateLimit = this.checkRateLimit();
      if (!withinRateLimit) {
        return {
          valid: false,
          reason: "Rate limit exceeded",
        };
      }
    } catch (error) {
      return {
        valid: false,
        reason: error instanceof Error ? error.message : String(error),
      };
    }

    // All checks passed
    return { valid: true };
  }

  /**
   * Creates a security manager with default settings for AI agents
   *
   * @returns A configured TransactionSecurity instance
   */
  public static createDefault(): TransactionSecurity {
    return new TransactionSecurity(
      {
        maxAmount: 100, // Limit to 100 XRD by default
        allowResourceCreation: true,
        allowComponentCalls: true,
        maxActionsPerTransaction: 5,
      },
      {
        maxTransactions: 10,
        timeWindowMs: 60000, // 1 minute
        throwOnLimit: false,
      }
    );
  }
}

/**
 * Input validation utilities
 */
export class InputValidator {
  /**
   * Validates a Radix address
   *
   * @param address The address to validate
   * @returns Whether the address is valid
   */
  public static isValidAddress(address: string): boolean {
    // Basic validation - Radix addresses start with "rdx1" for accounts
    // This is a simplified check - the SDK has more comprehensive validation
    return (
      typeof address === "string" &&
      address.startsWith("rdx1") &&
      address.length >= 42
    );
  }

  /**
   * Validates an amount
   *
   * @param amount The amount to validate
   * @returns Whether the amount is valid
   */
  public static isValidAmount(amount: number | string): boolean {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    return !isNaN(numAmount) && numAmount > 0 && isFinite(numAmount);
  }

  /**
   * Sanitizes a string input
   *
   * @param input The input to sanitize
   * @returns Sanitized input
   */
  public static sanitizeString(input: string): string {
    // Remove potentially dangerous characters but preserve quotes in content
    return input.replace(/<[^>]*>/g, "").replace(/[&]/g, "");
  }

  /**
   * Validates and normalizes an amount
   *
   * @param amount The amount to validate and normalize
   * @returns Normalized amount or throws an error if invalid
   */
  public static normalizeAmount(amount: number | string): number {
    if (!this.isValidAmount(amount)) {
      throw new Error(`Invalid amount: ${amount}`);
    }

    return typeof amount === "string" ? parseFloat(amount) : amount;
  }
}

/**
 * Secure logging utilities
 */
export class SecureLogger {
  private static readonly SENSITIVE_FIELDS = [
    "privateKey",
    "mnemonic",
    "seed",
    "password",
    "secret",
    "key",
  ];

  /**
   * Logs a message with sensitive data redacted
   *
   * @param message The message to log
   * @param data Additional data to log
   */
  public static log(message: string, data?: any): void {
    console.log(message, data ? this.redactSensitiveData(data) : "");
  }

  /**
   * Logs an error with sensitive data redacted
   *
   * @param message The error message
   * @param error The error object
   */
  public static error(message: string, error?: any): void {
    console.error(message, error ? this.redactSensitiveData(error) : "");
  }

  /**
   * Redacts sensitive data from an object
   *
   * @param data The data to redact
   * @returns Redacted data
   */
  private static redactSensitiveData(data: any): any {
    if (typeof data !== "object" || data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.redactSensitiveData(item));
    }

    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      if (
        this.SENSITIVE_FIELDS.some((field) => key.toLowerCase().includes(field))
      ) {
        result[key] = "[REDACTED]";
      } else if (typeof value === "object" && value !== null) {
        result[key] = this.redactSensitiveData(value);
      } else {
        result[key] = value;
      }
    }

    return result;
  }
}
