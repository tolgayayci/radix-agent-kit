import {
  DeFi,
  StakeXRDOptions,
  UnstakeXRDOptions,
  ClaimXRDOptions,
} from "../src/radix/DeFi";
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

describe("DeFi Staking Operations", () => {
  let defi: DeFi;
  let mockTxBuilder: jest.Mocked<RadixTransactionBuilder>;
  let mockGatewayClient: jest.Mocked<RadixGatewayClient>;
  let mockWallet: jest.Mocked<RadixWallet>;

  const mockOwnerAddress =
    "account_rdx1qsp7g6n7kj8p8fwjnwkwxk3qk2tv7hhvg5h8dxyz";
  const mockValidatorAddress =
    "validator_rdx1qvps5j2nn7edwk8f6tvz4z4jh8aqpht0m3jrdvj9z2sz6vh5qc8qrq";
  const mockStakeUnitAddress =
    "resource_rdx1qzrxdcw8q8x9v9nz3l4xp6j0d8wjsrvm3z4xyzstk";
  const mockXRDAddress =
    "resource_rdx1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxradxrd";
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
    mockTxBuilder.getXRDResourceAddress = jest
      .fn()
      .mockReturnValue(mockXRDAddress);

    // Create DeFi instance with mocks
    defi = new DeFi(mockTxBuilder, mockGatewayClient, mockNetworkId);
  });

  describe("stakeXRD", () => {
    it("should stake XRD with a validator", async () => {
      // Arrange
      const options: StakeXRDOptions = {
        ownerAddress: mockOwnerAddress,
        validatorAddress: mockValidatorAddress,
        amount: 100,
      };

      // Act
      const result = await defi.stakeXRD(options, mockWallet, 123);

      // Assert
      expect(mockTxBuilder.buildCustomManifestTransaction).toHaveBeenCalled();
      expect(mockTxBuilder.getCompiledTransactionHex).toHaveBeenCalled();
      expect(mockGatewayClient.submitTransaction).toHaveBeenCalled();
      expect(result).toBe(mockTxId);
    });

    it("should handle errors when staking XRD", async () => {
      // Arrange
      const options: StakeXRDOptions = {
        ownerAddress: mockOwnerAddress,
        validatorAddress: mockValidatorAddress,
        amount: 100,
      };

      mockTxBuilder.buildCustomManifestTransaction.mockRejectedValue(
        new Error("Test error")
      );

      // Act & Assert
      await expect(defi.stakeXRD(options, mockWallet, 123)).rejects.toThrow(
        "Failed to stake XRD: Error: Test error"
      );
    });
  });

  describe("unstakeXRD", () => {
    it("should unstake XRD from a validator", async () => {
      // Arrange
      const options: UnstakeXRDOptions = {
        ownerAddress: mockOwnerAddress,
        validatorAddress: mockValidatorAddress,
        amount: 50,
      };

      mockGatewayClient.getEntityDetails = jest.fn().mockResolvedValue({
        items: [
          {
            details: {
              state: {
                stake_unit_resource: mockStakeUnitAddress,
              },
            },
          },
        ],
      });

      // Act
      const result = await defi.unstakeXRD(options, mockWallet, 123);

      // Assert
      expect(mockGatewayClient.getEntityDetails).toHaveBeenCalledWith(
        mockValidatorAddress
      );
      expect(mockTxBuilder.buildCustomManifestTransaction).toHaveBeenCalled();
      expect(mockGatewayClient.submitTransaction).toHaveBeenCalled();
      expect(result).toBe(mockTxId);
    });

    it("should throw an error if stake unit address cannot be determined", async () => {
      // Arrange
      const options: UnstakeXRDOptions = {
        ownerAddress: mockOwnerAddress,
        validatorAddress: mockValidatorAddress,
        amount: 50,
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
      await expect(defi.unstakeXRD(options, mockWallet, 123)).rejects.toThrow(
        "Could not determine stake unit address"
      );
    });
  });

  describe("claimXRD", () => {
    it("should claim XRD from a validator", async () => {
      // Arrange
      const options: ClaimXRDOptions = {
        ownerAddress: mockOwnerAddress,
        validatorAddress: mockValidatorAddress,
      };

      mockGatewayClient.getEntityDetails = jest.fn().mockResolvedValue({
        items: [
          {
            details: {
              state: {
                pending_claims: [
                  {
                    owner: mockOwnerAddress,
                    amount: "10",
                  },
                ],
              },
            },
          },
        ],
      });

      // Act
      const result = await defi.claimXRD(options, mockWallet, 123);

      // Assert
      expect(mockGatewayClient.getEntityDetails).toHaveBeenCalledWith(
        mockValidatorAddress
      );
      expect(mockTxBuilder.buildCustomManifestTransaction).toHaveBeenCalled();
      expect(mockGatewayClient.submitTransaction).toHaveBeenCalled();
      expect(result).toBe(mockTxId);
    });

    it("should use placeholder claim data if no claims are found", async () => {
      // Arrange
      const options: ClaimXRDOptions = {
        ownerAddress: mockOwnerAddress,
        validatorAddress: mockValidatorAddress,
      };

      mockGatewayClient.getEntityDetails = jest.fn().mockResolvedValue({
        items: [
          {
            details: {
              state: {
                pending_claims: [],
              },
            },
          },
        ],
      });

      // Act
      const result = await defi.claimXRD(options, mockWallet, 123);

      // Assert
      expect(mockGatewayClient.getEntityDetails).toHaveBeenCalledWith(
        mockValidatorAddress
      );
      expect(mockTxBuilder.buildCustomManifestTransaction).toHaveBeenCalled();
      expect(mockGatewayClient.submitTransaction).toHaveBeenCalled();
      expect(result).toBe(mockTxId);
    });
  });
});
