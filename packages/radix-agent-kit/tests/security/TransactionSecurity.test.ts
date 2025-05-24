import {
  TransactionSecurity,
  InputValidator,
  SecureLogger,
  ValidationResult,
} from "../../src/security/TransactionSecurity";
import { SignableTransactionIntent } from "../../src/radix/RadixWallet";

describe("TransactionSecurity", () => {
  // Mock transaction intent for testing
  const mockTransaction: SignableTransactionIntent = {
    intentHash: "mock-intent-hash",
    payloadBytes: new Uint8Array([1, 2, 3, 4]),
    intent: { type: "mock-intent" },
  };

  describe("Transaction Validation", () => {
    test("should validate transaction amount", () => {
      const security = new TransactionSecurity({
        maxAmount: 100,
      });

      // Valid amount
      const validResult = security.validateTransaction(mockTransaction, {
        totalAmount: 50,
      });
      expect(validResult.valid).toBe(true);

      // Invalid amount (exceeds max)
      const invalidResult = security.validateTransaction(mockTransaction, {
        totalAmount: 150,
      });
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.reason).toContain("exceeds maximum allowed");
    });

    test("should validate destination whitelist", () => {
      const security = new TransactionSecurity({
        allowedDestinations: [
          "rdx1qsp7gczh74kg2ydwqww0gkxd2z5xhm2m4l5mp3dkqvqkjzuuuk3jvg7jrh3",
        ],
      });

      // Valid destination
      const validResult = security.validateTransaction(mockTransaction, {
        destinations: [
          "rdx1qsp7gczh74kg2ydwqww0gkxd2z5xhm2m4l5mp3dkqvqkjzuuuk3jvg7jrh3",
        ],
      });
      expect(validResult.valid).toBe(true);

      // Invalid destination (not in whitelist)
      const invalidResult = security.validateTransaction(mockTransaction, {
        destinations: [
          "rdx1qsp0000000000000000000000000000000000000000000000000000000000",
        ],
      });
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.reason).toContain("not in whitelist");
    });

    test("should validate destination blacklist", () => {
      const security = new TransactionSecurity({
        forbiddenDestinations: [
          "rdx1qsp0000000000000000000000000000000000000000000000000000000000",
        ],
      });

      // Valid destination (not in blacklist)
      const validResult = security.validateTransaction(mockTransaction, {
        destinations: [
          "rdx1qsp7gczh74kg2ydwqww0gkxd2z5xhm2m4l5mp3dkqvqkjzuuuk3jvg7jrh3",
        ],
      });
      expect(validResult.valid).toBe(true);

      // Invalid destination (in blacklist)
      const invalidResult = security.validateTransaction(mockTransaction, {
        destinations: [
          "rdx1qsp0000000000000000000000000000000000000000000000000000000000",
        ],
      });
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.reason).toContain("Blacklisted destinations");
    });

    test("should validate resource creation permission", () => {
      const security = new TransactionSecurity({
        allowResourceCreation: false,
      });

      // No resource creation (valid)
      const validResult = security.validateTransaction(mockTransaction, {
        hasResourceCreation: false,
      });
      expect(validResult.valid).toBe(true);

      // With resource creation (invalid)
      const invalidResult = security.validateTransaction(mockTransaction, {
        hasResourceCreation: true,
      });
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.reason).toContain(
        "Resource creation is not allowed"
      );
    });

    test("should validate component calls permission", () => {
      const security = new TransactionSecurity({
        allowComponentCalls: false,
      });

      // No component calls (valid)
      const validResult = security.validateTransaction(mockTransaction, {
        hasComponentCalls: false,
      });
      expect(validResult.valid).toBe(true);

      // With component calls (invalid)
      const invalidResult = security.validateTransaction(mockTransaction, {
        hasComponentCalls: true,
      });
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.reason).toContain("Component calls are not allowed");
    });

    test("should validate action count", () => {
      const security = new TransactionSecurity({
        maxActionsPerTransaction: 3,
      });

      // Valid action count
      const validResult = security.validateTransaction(mockTransaction, {
        actionCount: 2,
      });
      expect(validResult.valid).toBe(true);

      // Invalid action count (exceeds max)
      const invalidResult = security.validateTransaction(mockTransaction, {
        actionCount: 5,
      });
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.reason).toContain("exceeding maximum allowed");
    });
  });

  describe("Rate Limiting", () => {
    test("should enforce rate limits", () => {
      const security = new TransactionSecurity(
        {},
        {
          maxTransactions: 3,
          timeWindowMs: 1000,
          throwOnLimit: false,
        }
      );

      // First 3 transactions should be allowed
      expect(security.checkRateLimit()).toBe(true);
      expect(security.checkRateLimit()).toBe(true);
      expect(security.checkRateLimit()).toBe(true);

      // 4th transaction should be denied
      expect(security.checkRateLimit()).toBe(false);
    });

    test("should throw error when configured to do so", () => {
      const security = new TransactionSecurity(
        {},
        {
          maxTransactions: 2,
          timeWindowMs: 1000,
          throwOnLimit: true,
        }
      );

      // First 2 transactions should be allowed
      expect(security.checkRateLimit()).toBe(true);
      expect(security.checkRateLimit()).toBe(true);

      // 3rd transaction should throw
      expect(() => security.checkRateLimit()).toThrow("Rate limit exceeded");
    });

    test("should clear old transactions after time window", async () => {
      jest.useFakeTimers();

      const security = new TransactionSecurity(
        {},
        {
          maxTransactions: 2,
          timeWindowMs: 1000,
          throwOnLimit: false,
        }
      );

      // First 2 transactions should be allowed
      expect(security.checkRateLimit()).toBe(true);
      expect(security.checkRateLimit()).toBe(true);

      // 3rd transaction should be denied
      expect(security.checkRateLimit()).toBe(false);

      // Advance time by more than the window
      jest.advanceTimersByTime(1100);

      // Should be allowed again
      expect(security.checkRateLimit()).toBe(true);

      jest.useRealTimers();
    });
  });

  describe("Combined Validation and Rate Limiting", () => {
    test("should validate transaction and check rate limits", () => {
      const security = new TransactionSecurity(
        {
          maxAmount: 100,
        },
        {
          maxTransactions: 1,
          timeWindowMs: 1000,
          throwOnLimit: false,
        }
      );

      // First transaction should pass both validation and rate limit
      const result1 = security.validateAndCheckRateLimit(mockTransaction, {
        totalAmount: 50,
      });
      expect(result1.valid).toBe(true);

      // Second transaction should fail rate limit
      const result2 = security.validateAndCheckRateLimit(mockTransaction, {
        totalAmount: 50,
      });
      expect(result2.valid).toBe(false);
      expect(result2.reason).toContain("Rate limit exceeded");

      // Transaction with invalid amount should fail validation
      const result3 = security.validateAndCheckRateLimit(mockTransaction, {
        totalAmount: 150,
      });
      expect(result3.valid).toBe(false);
      expect(result3.reason).toContain("exceeds maximum allowed");
    });
  });

  describe("Default Security Manager", () => {
    test("should create a default security manager", () => {
      const security = TransactionSecurity.createDefault();

      // Should have default validation options
      const validationResult = security.validateTransaction(mockTransaction, {
        totalAmount: 50,
        actionCount: 3,
      });
      expect(validationResult.valid).toBe(true);

      // Should have default rate limiting
      expect(security.checkRateLimit()).toBe(true);
    });
  });
});

describe("InputValidator", () => {
  test("should validate Radix addresses", () => {
    // Valid address
    expect(
      InputValidator.isValidAddress(
        "rdx1qsp7gczh74kg2ydwqww0gkxd2z5xhm2m4l5mp3dkqvqkjzuuuk3jvg7jrh3"
      )
    ).toBe(true);

    // Invalid addresses
    expect(InputValidator.isValidAddress("not-an-address")).toBe(false);
    expect(
      InputValidator.isValidAddress(
        "xrd1qsp7gczh74kg2ydwqww0gkxd2z5xhm2m4l5mp3dkqvqkjzuuuk3jvg7jrh3"
      )
    ).toBe(false);
  });

  test("should validate amounts", () => {
    // Valid amounts
    expect(InputValidator.isValidAmount(100)).toBe(true);
    expect(InputValidator.isValidAmount("50.5")).toBe(true);

    // Invalid amounts
    expect(InputValidator.isValidAmount(0)).toBe(false);
    expect(InputValidator.isValidAmount(-10)).toBe(false);
    expect(InputValidator.isValidAmount("abc")).toBe(false);
  });

  test("should sanitize strings", () => {
    expect(
      InputValidator.sanitizeString("Hello <script>alert('xss')</script>")
    ).toBe("Hello alert('xss')");
    expect(InputValidator.sanitizeString('Test "quotes" & <tags>')).toBe(
      'Test "quotes"  '
    );
  });

  test("should normalize amounts", () => {
    expect(InputValidator.normalizeAmount(100)).toBe(100);
    expect(InputValidator.normalizeAmount("50.5")).toBe(50.5);

    // Should throw for invalid amounts
    expect(() => InputValidator.normalizeAmount(-10)).toThrow("Invalid amount");
    expect(() => InputValidator.normalizeAmount("abc")).toThrow(
      "Invalid amount"
    );
  });
});

describe("SecureLogger", () => {
  test("should redact sensitive data", () => {
    // Mock console.log to capture output
    const originalConsoleLog = console.log;
    const mockConsoleLog = jest.fn();
    console.log = mockConsoleLog;

    // Test data with sensitive fields
    const testData = {
      username: "user123",
      privateKey: "super-secret-key",
      mnemonic: "word1 word2 word3",
      metadata: {
        password: "secret-password",
        publicInfo: "public-data",
      },
    };

    // Log with sensitive data
    SecureLogger.log("Test log", testData);

    // Verify sensitive data was redacted
    expect(mockConsoleLog).toHaveBeenCalled();
    const loggedData = mockConsoleLog.mock.calls[0][1];

    expect(loggedData.username).toBe("user123");
    expect(loggedData.privateKey).toBe("[REDACTED]");
    expect(loggedData.mnemonic).toBe("[REDACTED]");
    expect(loggedData.metadata.password).toBe("[REDACTED]");
    expect(loggedData.metadata.publicInfo).toBe("public-data");

    // Restore original console.log
    console.log = originalConsoleLog;
  });

  test("should handle error logging", () => {
    // Mock console.error to capture output
    const originalConsoleError = console.error;
    const mockConsoleError = jest.fn();
    console.error = mockConsoleError;

    // Test error with sensitive data
    const testError = {
      message: "Test error",
      privateKey: "secret-key-data",
    };

    // Log error with sensitive data
    SecureLogger.error("Error occurred", testError);

    // Verify sensitive data was redacted
    expect(mockConsoleError).toHaveBeenCalled();
    const loggedError = mockConsoleError.mock.calls[0][1];

    expect(loggedError.message).toBe("Test error");
    expect(loggedError.privateKey).toBe("[REDACTED]");

    // Restore original console.error
    console.error = originalConsoleError;
  });
});
