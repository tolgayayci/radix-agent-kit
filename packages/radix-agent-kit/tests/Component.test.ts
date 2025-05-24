import {
  Component,
  CallComponentMethodOptions,
  GetComponentStateOptions,
} from "../src/radix/Component";
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

describe("Component Interaction Operations", () => {
  let component: Component;
  let mockTxBuilder: jest.Mocked<RadixTransactionBuilder>;
  let mockGatewayClient: jest.Mocked<RadixGatewayClient>;
  let mockWallet: jest.Mocked<RadixWallet>;

  const mockOwnerAddress =
    "account_rdx1qsp7g6n7kj8p8fwjnwkwxk3qk2tv7hhvg5h8dxyz";
  const mockComponentAddress =
    "component_rdx1cptxxxxxxxxxcomponentxxxxxxxxx000527798379xxxxxxxxxakj7ss";
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

    // Create Component instance with mocks
    component = new Component(mockTxBuilder, mockGatewayClient, mockNetworkId);
  });

  describe("callComponentMethod", () => {
    it("should call a component method", async () => {
      // Arrange
      const options: CallComponentMethodOptions = {
        ownerAddress: mockOwnerAddress,
        componentAddress: mockComponentAddress,
        method: "test_method",
        args: ["arg1", 123, true],
      };

      // Act
      const result = await component.callComponentMethod(
        options,
        mockWallet,
        123
      );

      // Assert
      expect(mockTxBuilder.buildCustomManifestTransaction).toHaveBeenCalled();
      const manifest =
        mockTxBuilder.buildCustomManifestTransaction.mock.calls[0][0];
      expect(manifest).toContain("test_method");
      expect(manifest).toContain(mockComponentAddress);
      expect(manifest).toContain('"arg1"');
      expect(manifest).toContain("123");
      expect(manifest).toContain("true");
      expect(mockTxBuilder.getCompiledTransactionHex).toHaveBeenCalled();
      expect(mockGatewayClient.submitTransaction).toHaveBeenCalled();
      expect(result).toBe(mockTxId);
    });

    it("should handle complex arguments", async () => {
      // Arrange
      const options: CallComponentMethodOptions = {
        ownerAddress: mockOwnerAddress,
        componentAddress: mockComponentAddress,
        method: "complex_method",
        args: [
          { key1: "value1", key2: 123 },
          [1, 2, 3],
          mockOwnerAddress, // Should be formatted as Address
        ],
      };

      // Act
      const result = await component.callComponentMethod(
        options,
        mockWallet,
        123
      );

      // Assert
      expect(mockTxBuilder.buildCustomManifestTransaction).toHaveBeenCalled();
      const manifest =
        mockTxBuilder.buildCustomManifestTransaction.mock.calls[0][0];
      expect(manifest).toContain("complex_method");
      expect(manifest).toContain("Map<String");
      expect(manifest).toContain("Array<u32>");
      expect(manifest).toContain(`Address("${mockOwnerAddress}")`);
      expect(mockGatewayClient.submitTransaction).toHaveBeenCalled();
      expect(result).toBe(mockTxId);
    });

    it("should handle errors when calling a component method", async () => {
      // Arrange
      const options: CallComponentMethodOptions = {
        ownerAddress: mockOwnerAddress,
        componentAddress: mockComponentAddress,
        method: "test_method",
        args: ["arg1"],
      };

      mockTxBuilder.buildCustomManifestTransaction.mockRejectedValue(
        new Error("Test error")
      );

      // Act & Assert
      await expect(
        component.callComponentMethod(options, mockWallet, 123)
      ).rejects.toThrow("Failed to call component method: Error: Test error");
    });
  });

  describe("getComponentState", () => {
    it("should get component state", async () => {
      // Arrange
      const options: GetComponentStateOptions = {
        componentAddress: mockComponentAddress,
      };

      const mockComponentState = {
        counter: 42,
        name: "Test Component",
        active: true,
      };

      mockGatewayClient.getEntityDetails = jest.fn().mockResolvedValue({
        items: [
          {
            details: {
              state: mockComponentState,
            },
            metadata: {
              name: "Test Component",
            },
          },
        ],
      });

      // Act
      const result = await component.getComponentState(options);

      // Assert
      expect(mockGatewayClient.getEntityDetails).toHaveBeenCalledWith(
        mockComponentAddress,
        expect.any(Object)
      );
      expect(result.state).toEqual(mockComponentState);
      expect(result.address).toBe(mockComponentAddress);
    });

    it("should handle component not found", async () => {
      // Arrange
      const options: GetComponentStateOptions = {
        componentAddress: mockComponentAddress,
      };

      mockGatewayClient.getEntityDetails = jest.fn().mockResolvedValue({
        items: [],
      });

      // Act & Assert
      await expect(component.getComponentState(options)).rejects.toThrow(
        `Component ${mockComponentAddress} not found`
      );
    });

    it("should handle errors when getting component state", async () => {
      // Arrange
      const options: GetComponentStateOptions = {
        componentAddress: mockComponentAddress,
      };

      mockGatewayClient.getEntityDetails = jest
        .fn()
        .mockRejectedValue(new Error("Test error"));

      // Act & Assert
      await expect(component.getComponentState(options)).rejects.toThrow(
        "Failed to get component state: Error: Test error"
      );
    });
  });
});
