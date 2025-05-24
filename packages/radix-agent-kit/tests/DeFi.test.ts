import { DeFi } from "../src/radix/DeFi";
import { RadixTransactionBuilder } from "../src/radix/RadixTransactionBuilder";
import {
  RadixGatewayClient,
  RadixNetwork,
} from "../src/radix/RadixGatewayClient";
import { RadixWallet } from "../src/radix/RadixWallet";

// Mock dependencies
jest.mock("../src/radix/RadixTransactionBuilder");
jest.mock("../src/radix/RadixGatewayClient");
jest.mock("../src/radix/RadixWallet");

describe("DeFi", () => {
  let defi: DeFi;
  let mockTxBuilder: jest.Mocked<RadixTransactionBuilder>;
  let mockGatewayClient: jest.Mocked<RadixGatewayClient>;
  let mockWallet: jest.Mocked<RadixWallet>;

  const mockOwnerAddress =
    "account_rdx1qsp7g6n7kj8p8fwjnwkwxk3qk2tv7hhvg5h8dxyz";
  const mockResourceAddress1 =
    "resource_rdx1qzrxdcw8q8x9v9nz3l4xp6j0d8wjsrvm3z4xyzabc";
  const mockResourceAddress2 =
    "resource_rdx1qzrxdcw8q8x9v9nz3l4xp6j0d8wjsrvm3z4xyzdef";
  const mockPoolAddress =
    "component_rdx1qcp4256h8atv7ex9j5qyt8cz7r73v4aey9nqghijk";
  const mockLpTokenAddress =
    "resource_rdx1qzrxdcw8q8x9v9nz3l4xp6j0d8wjsrvm3z4xyzlmn";
  const mockTxId = "tx_12345abcdef";
  const mockNetworkId = 1; // Mainnet

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockTxBuilder = new RadixTransactionBuilder({
      networkId: RadixNetwork.Mainnet,
    }) as jest.Mocked<RadixTransactionBuilder>;

    mockGatewayClient = new RadixGatewayClient({
      networkId: RadixNetwork.Mainnet,
    }) as jest.Mocked<RadixGatewayClient>;

    mockWallet = {
      getAddress: jest.fn().mockReturnValue(mockOwnerAddress),
      getPublicKey: jest.fn().mockReturnValue("mock-public-key"),
      sign: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    } as unknown as jest.Mocked<RadixWallet>;

    // Set up common mock behaviors
    mockGatewayClient.getCurrentEpoch = jest.fn().mockResolvedValue(123);
    mockGatewayClient.submitTransaction = jest
      .fn()
      .mockResolvedValue({ duplicate: false });

    mockTxBuilder.buildCustomManifestTransaction = jest
      .fn()
      .mockResolvedValue(new Uint8Array([7, 8, 9]));
    mockTxBuilder.getCompiledTransactionHex = jest
      .fn()
      .mockReturnValue(mockTxId);
    mockTxBuilder.prevalidate = jest.fn().mockResolvedValue(true);

    // Create DeFi instance with mocks
    defi = new DeFi(mockTxBuilder, mockGatewayClient, mockNetworkId);
  });

  describe("createTwoResourcePool", () => {
    it("should create a two-resource pool", async () => {
      // Arrange
      const options = {
        ownerAddress: mockOwnerAddress,
        resourceAddress1: mockResourceAddress1,
        resourceAddress2: mockResourceAddress2,
        poolName: "Test Pool",
        poolSymbol: "TPOOL",
      };

      // Act
      const result = await defi.createTwoResourcePool(options, mockWallet, 123);

      // Assert
      expect(mockTxBuilder.buildCustomManifestTransaction).toHaveBeenCalled();
      expect(mockTxBuilder.getCompiledTransactionHex).toHaveBeenCalled();
      expect(mockGatewayClient.submitTransaction).toHaveBeenCalled();
      expect(result).toBe(mockTxId);
    });

    it("should handle errors when creating a pool", async () => {
      // Arrange
      const options = {
        ownerAddress: mockOwnerAddress,
        resourceAddress1: mockResourceAddress1,
        resourceAddress2: mockResourceAddress2,
      };

      mockTxBuilder.buildCustomManifestTransaction.mockRejectedValue(
        new Error("Test error")
      );

      // Act & Assert
      await expect(
        defi.createTwoResourcePool(options, mockWallet, 123)
      ).rejects.toThrow(
        "Failed to create two-resource pool: Error: Test error"
      );
    });
  });

  describe("addLiquidity", () => {
    it("should add liquidity to a pool", async () => {
      // Arrange
      const options = {
        ownerAddress: mockOwnerAddress,
        poolAddress: mockPoolAddress,
        amounts: [100, 200] as [number, number],
      };

      mockGatewayClient.getEntityDetails = jest.fn().mockResolvedValue({
        items: [
          {
            details: {
              state: {
                resources: [
                  { resource_address: mockResourceAddress1 },
                  { resource_address: mockResourceAddress2 },
                ],
              },
            },
          },
        ],
      });

      // Act
      const result = await defi.addLiquidity(options, mockWallet, 123);

      // Assert
      expect(mockGatewayClient.getEntityDetails).toHaveBeenCalledWith(
        mockPoolAddress
      );
      expect(mockTxBuilder.buildCustomManifestTransaction).toHaveBeenCalled();
      expect(mockGatewayClient.submitTransaction).toHaveBeenCalled();
      expect(result).toBe(mockTxId);
    });

    it("should throw an error if pool does not have enough resources", async () => {
      // Arrange
      const options = {
        ownerAddress: mockOwnerAddress,
        poolAddress: mockPoolAddress,
        amounts: [100, 200] as [number, number],
      };

      mockGatewayClient.getEntityDetails = jest.fn().mockResolvedValue({
        items: [
          {
            details: {
              state: {
                resources: [{ resource_address: mockResourceAddress1 }],
              },
            },
          },
        ],
      });

      // Act & Assert
      await expect(defi.addLiquidity(options, mockWallet, 123)).rejects.toThrow(
        "Pool does not have enough resources"
      );
    });
  });

  describe("removeLiquidity", () => {
    it("should remove liquidity from a pool", async () => {
      // Arrange
      const options = {
        ownerAddress: mockOwnerAddress,
        poolAddress: mockPoolAddress,
        amountLP: 50,
      };

      mockGatewayClient.getEntityDetails = jest.fn().mockResolvedValue({
        items: [
          {
            details: {
              state: {
                resources: [
                  { resource_address: mockResourceAddress1 },
                  { resource_address: mockResourceAddress2 },
                  { resource_address: mockLpTokenAddress },
                ],
              },
            },
          },
        ],
      });

      // Act
      const result = await defi.removeLiquidity(options, mockWallet, 123);

      // Assert
      expect(mockGatewayClient.getEntityDetails).toHaveBeenCalledWith(
        mockPoolAddress
      );
      expect(mockTxBuilder.buildCustomManifestTransaction).toHaveBeenCalled();
      expect(mockGatewayClient.submitTransaction).toHaveBeenCalled();
      expect(result).toBe(mockTxId);
    });

    it("should throw an error if LP token address cannot be determined", async () => {
      // Arrange
      const options = {
        ownerAddress: mockOwnerAddress,
        poolAddress: mockPoolAddress,
        amountLP: 50,
      };

      mockGatewayClient.getEntityDetails = jest.fn().mockResolvedValue({
        items: [
          {
            details: {
              state: {
                resources: [],
              },
            },
          },
        ],
      });

      // Act & Assert
      await expect(
        defi.removeLiquidity(options, mockWallet, 123)
      ).rejects.toThrow("Could not determine LP token address");
    });
  });

  describe("swapTokens", () => {
    it("should swap tokens in a pool", async () => {
      // Arrange
      const options = {
        ownerAddress: mockOwnerAddress,
        poolAddress: mockPoolAddress,
        fromResourceAddress: mockResourceAddress1,
        toResourceAddress: mockResourceAddress2,
        amountIn: 100,
        minAmountOut: 90,
      };

      // Act
      const result = await defi.swapTokens(options, mockWallet, 123);

      // Assert
      expect(mockTxBuilder.buildCustomManifestTransaction).toHaveBeenCalled();
      expect(mockGatewayClient.submitTransaction).toHaveBeenCalled();
      expect(result).toBe(mockTxId);
    });

    it("should handle errors when swapping tokens", async () => {
      // Arrange
      const options = {
        ownerAddress: mockOwnerAddress,
        poolAddress: mockPoolAddress,
        fromResourceAddress: mockResourceAddress1,
        toResourceAddress: mockResourceAddress2,
        amountIn: 100,
      };

      mockTxBuilder.buildCustomManifestTransaction.mockRejectedValue(
        new Error("Test error")
      );

      // Act & Assert
      await expect(defi.swapTokens(options, mockWallet, 123)).rejects.toThrow(
        "Failed to swap tokens: Error: Test error"
      );
    });
  });

  describe("previewSwap", () => {
    it("should preview a swap and return estimated output", async () => {
      // Arrange
      const options = {
        ownerAddress: mockOwnerAddress,
        poolAddress: mockPoolAddress,
        fromResourceAddress: mockResourceAddress1,
        toResourceAddress: mockResourceAddress2,
        amountIn: 100,
      };

      // Act
      const result = await defi.previewSwap(options, mockWallet, 123);

      // Assert
      expect(mockTxBuilder.prevalidate).toHaveBeenCalled();
      expect(result).toBe("0.0"); // The placeholder value from our implementation
    });
  });
});
