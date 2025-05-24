// ==================================================
// RADIX AGENT KIT - INTEGRATION TESTS
// ==================================================

import { RadixMnemonicWallet } from "../../src/radix/MnemonicWallet";
import {
  RadixGatewayClient,
  RadixNetwork,
} from "../../src/radix/RadixGatewayClient";
import { RadixTransactionBuilder } from "../../src/radix/RadixTransactionBuilder";
import { RadixAccount } from "../../src/radix/RadixAccount";
import { DeFi } from "../../src/radix/DeFi";
import { NetworkId } from "@radixdlt/radix-engine-toolkit";

describe("Radix Integration Tests", () => {
  let wallet: RadixMnemonicWallet;
  let gatewayClient: RadixGatewayClient;
  let transactionBuilder: RadixTransactionBuilder;
  let account: RadixAccount;

  beforeEach(() => {
    // Use Stokenet for testing
    wallet = RadixMnemonicWallet.generateRandom({
      networkId: NetworkId.Stokenet,
      applicationName: "IntegrationTest",
    });

    gatewayClient = new RadixGatewayClient({
      networkId: RadixNetwork.Stokenet,
      applicationName: "IntegrationTest",
    });

    transactionBuilder = new RadixTransactionBuilder({
      networkId: RadixNetwork.Stokenet,
    });

    account = new RadixAccount(gatewayClient, NetworkId.Stokenet, wallet);
  });

  test("should create complete account workflow", async () => {
    // Test account creation
    const address = wallet.getAddress();
    expect(address).toBeTruthy();

    // Test account info retrieval (might fail if account doesn't exist)
    try {
      const accountInfo = await gatewayClient.getEntityDetails(address);
      expect(accountInfo).toBeTruthy();
    } catch (error) {
      console.log(
        "Account does not exist on ledger yet:",
        error instanceof Error ? error.message : String(error)
      );
    }

    // Test balance check (might be empty)
    try {
      const balances = await account.getBalances(wallet.getAddress());
      expect(Array.isArray(balances)).toBe(true);
    } catch (error) {
      console.log(
        "Cannot get balances for new account:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }, 15000);

  test("should create transaction manifests", async () => {
    const address = wallet.getAddress();
    const currentEpoch = await gatewayClient.getCurrentEpoch();

    const transferManifest = transactionBuilder.createTransferManifest(
      address,
      address, // Self-transfer for testing
      transactionBuilder.getXRDResourceAddress(),
      "1"
    );

    expect(transferManifest).toBeTruthy();
    expect(typeof transferManifest).toBe("string");
    expect(transferManifest.length).toBeGreaterThan(0);
  }, 15000);

  describe("DeFi Operations", () => {
    let defi: DeFi;

    beforeEach(() => {
      defi = new DeFi(transactionBuilder, gatewayClient, NetworkId.Stokenet);
    });

    test("should create pool manifest", async () => {
      // Skip actual transaction submission as it requires funded account
      // Just test manifest creation
      const address = wallet.getAddress();
      const currentEpoch = await gatewayClient.getCurrentEpoch();

      // Mock resource addresses for testing
      const resourceAddress1 = transactionBuilder.getXRDResourceAddress();
      const resourceAddress2 =
        "resource_tdx_2_1tknxxxxxxxxxfungiblexxxxxxxxx000527798379xxxxxxxxxakj7ss";

      try {
        // Create pool options
        const options = {
          ownerAddress: address,
          resourceAddress1,
          resourceAddress2,
          poolName: "Test Pool",
          poolSymbol: "TPOOL",
        };

        // Create a spy on the buildCustomManifestTransaction method
        const buildSpy = jest.spyOn(
          transactionBuilder,
          "buildCustomManifestTransaction"
        );

        // Call the method but catch any errors (we expect it might fail due to lack of funds)
        try {
          await defi.createTwoResourcePool(options, wallet, currentEpoch);
        } catch (error) {
          // We expect this might fail, but we want to verify the manifest was created
          console.log(
            "Pool creation failed as expected:",
            error instanceof Error ? error.message : String(error)
          );
        }

        // Verify the method was called with a manifest
        expect(buildSpy).toHaveBeenCalled();
        const manifest = buildSpy.mock.calls[0][0];
        expect(typeof manifest).toBe("string");
        expect(manifest).toContain("instantiate_pool");
        expect(manifest).toContain(resourceAddress1);
        expect(manifest).toContain(resourceAddress2);
        expect(manifest).toContain("Test Pool");
      } finally {
        jest.restoreAllMocks();
      }
    }, 15000);

    test("should create add liquidity manifest", async () => {
      const address = wallet.getAddress();
      const currentEpoch = await gatewayClient.getCurrentEpoch();
      const mockPoolAddress =
        "component_tdx_2_1cptxxxxxxxxxpoolxxxxxxxxxxxxxxxxxxx000527798379xxxxxxxxxakj7ss";

      try {
        // Create add liquidity options
        const options = {
          ownerAddress: address,
          poolAddress: mockPoolAddress,
          amounts: [100, 200] as [number, number],
        };

        // Mock the getEntityDetails response
        const mockGetEntityDetails = jest.spyOn(
          gatewayClient,
          "getEntityDetails"
        );
        mockGetEntityDetails.mockResolvedValue({
          items: [
            {
              details: {
                state: {
                  resources: [
                    {
                      resource_address:
                        transactionBuilder.getXRDResourceAddress(),
                    },
                    {
                      resource_address:
                        "resource_tdx_2_1tknxxxxxxxxxfungiblexxxxxxxxx000527798379xxxxxxxxxakj7ss",
                    },
                  ],
                },
              },
            },
          ],
        } as any);

        // Create a spy on the buildCustomManifestTransaction method
        const buildSpy = jest.spyOn(
          transactionBuilder,
          "buildCustomManifestTransaction"
        );

        // Call the method but catch any errors
        try {
          await defi.addLiquidity(options, wallet, currentEpoch);
        } catch (error) {
          console.log(
            "Add liquidity failed as expected:",
            error instanceof Error ? error.message : String(error)
          );
        }

        // Verify the method was called with a manifest
        expect(buildSpy).toHaveBeenCalled();
        const manifest = buildSpy.mock.calls[0][0];
        expect(typeof manifest).toBe("string");
        expect(manifest).toContain("add_liquidity");
        expect(manifest).toContain(mockPoolAddress);
      } finally {
        jest.restoreAllMocks();
      }
    }, 15000);

    test("should create swap tokens manifest", async () => {
      const address = wallet.getAddress();
      const currentEpoch = await gatewayClient.getCurrentEpoch();
      const mockPoolAddress =
        "component_tdx_2_1cptxxxxxxxxxpoolxxxxxxxxxxxxxxxxxxx000527798379xxxxxxxxxakj7ss";
      const resourceAddress1 = transactionBuilder.getXRDResourceAddress();
      const resourceAddress2 =
        "resource_tdx_2_1tknxxxxxxxxxfungiblexxxxxxxxx000527798379xxxxxxxxxakj7ss";

      try {
        // Create swap options
        const options = {
          ownerAddress: address,
          poolAddress: mockPoolAddress,
          fromResourceAddress: resourceAddress1,
          toResourceAddress: resourceAddress2,
          amountIn: 100,
          minAmountOut: 90,
        };

        // Create a spy on the buildCustomManifestTransaction method
        const buildSpy = jest.spyOn(
          transactionBuilder,
          "buildCustomManifestTransaction"
        );

        // Call the method but catch any errors
        try {
          await defi.swapTokens(options, wallet, currentEpoch);
        } catch (error) {
          console.log(
            "Swap tokens failed as expected:",
            error instanceof Error ? error.message : String(error)
          );
        }

        // Verify the method was called with a manifest
        expect(buildSpy).toHaveBeenCalled();
        const manifest = buildSpy.mock.calls[0][0];
        expect(typeof manifest).toBe("string");
        expect(manifest).toContain("swap");
        expect(manifest).toContain(mockPoolAddress);
        expect(manifest).toContain(resourceAddress1);
        expect(manifest).toContain(resourceAddress2);
      } finally {
        jest.restoreAllMocks();
      }
    }, 15000);
  });

  // Test staking operations
  describe("Staking Operations", () => {
    let defi: DeFi;

    beforeEach(() => {
      defi = new DeFi(transactionBuilder, gatewayClient, NetworkId.Stokenet);
    });

    test("should create stake XRD manifest", async () => {
      const address = wallet.getAddress();
      const currentEpoch = await gatewayClient.getCurrentEpoch();
      const mockValidatorAddress =
        "validator_tdx_2_1vpsxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

      try {
        // Create stake options
        const options = {
          ownerAddress: address,
          validatorAddress: mockValidatorAddress,
          amount: 100,
        };

        // Create a spy on the buildCustomManifestTransaction method
        const buildSpy = jest.spyOn(
          transactionBuilder,
          "buildCustomManifestTransaction"
        );

        // Call the method but catch any errors
        try {
          await defi.stakeXRD(options, wallet, currentEpoch);
        } catch (error) {
          console.log(
            "Stake XRD failed as expected:",
            error instanceof Error ? error.message : String(error)
          );
        }

        // Verify the method was called with a manifest
        expect(buildSpy).toHaveBeenCalled();
        const manifest = buildSpy.mock.calls[0][0];
        expect(typeof manifest).toBe("string");
        expect(manifest).toContain("stake");
        expect(manifest).toContain(mockValidatorAddress);
        expect(manifest).toContain(transactionBuilder.getXRDResourceAddress());
      } finally {
        jest.restoreAllMocks();
      }
    }, 15000);

    test("should create unstake XRD manifest", async () => {
      const address = wallet.getAddress();
      const currentEpoch = await gatewayClient.getCurrentEpoch();
      const mockValidatorAddress =
        "validator_tdx_2_1vpsxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
      const mockStakeUnitAddress =
        "resource_tdx_2_1tknxxxxxxxxxstakexxxxxxxxx000527798379xxxxxxxxxakj7ss";

      try {
        // Create unstake options
        const options = {
          ownerAddress: address,
          validatorAddress: mockValidatorAddress,
          amount: 50,
        };

        // Mock the getEntityDetails response
        const mockGetEntityDetails = jest.spyOn(
          gatewayClient,
          "getEntityDetails"
        );
        mockGetEntityDetails.mockResolvedValue({
          items: [
            {
              details: {
                state: {
                  stake_unit_resource: mockStakeUnitAddress,
                },
              },
            },
          ],
        } as any);

        // Create a spy on the buildCustomManifestTransaction method
        const buildSpy = jest.spyOn(
          transactionBuilder,
          "buildCustomManifestTransaction"
        );

        // Call the method but catch any errors
        try {
          await defi.unstakeXRD(options, wallet, currentEpoch);
        } catch (error) {
          console.log(
            "Unstake XRD failed as expected:",
            error instanceof Error ? error.message : String(error)
          );
        }

        // Verify the method was called with a manifest
        expect(buildSpy).toHaveBeenCalled();
        const manifest = buildSpy.mock.calls[0][0];
        expect(typeof manifest).toBe("string");
        expect(manifest).toContain("unstake");
        expect(manifest).toContain(mockValidatorAddress);
        expect(manifest).toContain(mockStakeUnitAddress);
      } finally {
        jest.restoreAllMocks();
      }
    }, 15000);

    test("should create claim XRD manifest", async () => {
      const address = wallet.getAddress();
      const currentEpoch = await gatewayClient.getCurrentEpoch();
      const mockValidatorAddress =
        "validator_tdx_2_1vpsxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

      try {
        // Create claim options
        const options = {
          ownerAddress: address,
          validatorAddress: mockValidatorAddress,
        };

        // Mock the getEntityDetails response
        const mockGetEntityDetails = jest.spyOn(
          gatewayClient,
          "getEntityDetails"
        );
        mockGetEntityDetails.mockResolvedValue({
          items: [
            {
              details: {
                state: {
                  pending_claims: [
                    {
                      owner: address,
                      amount: "10",
                    },
                  ],
                },
              },
            },
          ],
        } as any);

        // Create a spy on the buildCustomManifestTransaction method
        const buildSpy = jest.spyOn(
          transactionBuilder,
          "buildCustomManifestTransaction"
        );

        // Call the method but catch any errors
        try {
          await defi.claimXRD(options, wallet, currentEpoch);
        } catch (error) {
          console.log(
            "Claim XRD failed as expected:",
            error instanceof Error ? error.message : String(error)
          );
        }

        // Verify the method was called with a manifest
        expect(buildSpy).toHaveBeenCalled();
        const manifest = buildSpy.mock.calls[0][0];
        expect(typeof manifest).toBe("string");
        expect(manifest).toContain("claim_xrd");
        expect(manifest).toContain(mockValidatorAddress);
      } finally {
        jest.restoreAllMocks();
      }
    }, 15000);
  });
});
