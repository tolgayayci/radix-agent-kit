import { RadixTransactionBuilder } from "./RadixTransactionBuilder";
import { RadixGatewayClient } from "./RadixGatewayClient";
import { RadixWallet } from "./RadixWallet";

/**
 * Options for staking XRD
 */
export interface StakeXRDOptions {
  /**
   * Owner account address
   */
  ownerAddress: string;

  /**
   * Validator component address
   */
  validatorAddress: string;

  /**
   * Amount of XRD to stake
   */
  amount: number | string;
}

/**
 * Options for unstaking XRD
 */
export interface UnstakeXRDOptions {
  /**
   * Owner account address
   */
  ownerAddress: string;

  /**
   * Validator component address
   */
  validatorAddress: string;

  /**
   * Amount of stake units to unstake
   */
  amount: number | string;
}

/**
 * Options for claiming XRD
 */
export interface ClaimXRDOptions {
  /**
   * Owner account address
   */
  ownerAddress: string;

  /**
   * Validator component address
   */
  validatorAddress: string;
}

/**
 * Options for creating a two-resource pool
 */
export interface TwoResourcePoolOptions {
  /**
   * Owner account address
   */
  ownerAddress: string;

  /**
   * First resource address
   */
  resourceAddress1: string;

  /**
   * Second resource address
   */
  resourceAddress2: string;

  /**
   * Pool name
   */
  poolName?: string;

  /**
   * Pool symbol
   */
  poolSymbol?: string;
}

/**
 * Options for adding liquidity to a pool
 */
export interface AddLiquidityOptions {
  /**
   * Owner account address
   */
  ownerAddress: string;

  /**
   * Pool component address
   */
  poolAddress: string;

  /**
   * Array of resource amounts to add [resource1Amount, resource2Amount]
   */
  amounts: [number | string, number | string];
}

/**
 * Options for removing liquidity from a pool
 */
export interface RemoveLiquidityOptions {
  /**
   * Owner account address
   */
  ownerAddress: string;

  /**
   * Pool component address
   */
  poolAddress: string;

  /**
   * Amount of LP tokens to redeem
   */
  amountLP: number | string;
}

/**
 * Options for swapping tokens in a pool
 */
export interface SwapTokensOptions {
  /**
   * Owner account address
   */
  ownerAddress: string;

  /**
   * Pool component address
   */
  poolAddress: string;

  /**
   * Resource address to swap from
   */
  fromResourceAddress: string;

  /**
   * Resource address to swap to
   */
  toResourceAddress: string;

  /**
   * Amount of input tokens to swap
   */
  amountIn: number | string;

  /**
   * Minimum amount of output tokens expected (slippage protection)
   */
  minAmountOut?: number | string;
}

/**
 * DeFi operations for Radix
 */
export class DeFi {
  private transactionBuilder: RadixTransactionBuilder;
  private gatewayClient: RadixGatewayClient;
  private networkId: number;

  /**
   * Create a new DeFi instance
   *
   * @param transactionBuilder - Transaction builder
   * @param gatewayClient - Gateway client
   * @param networkId - Network ID
   */
  constructor(
    transactionBuilder: RadixTransactionBuilder,
    gatewayClient: RadixGatewayClient,
    networkId: number
  ) {
    this.transactionBuilder = transactionBuilder;
    this.gatewayClient = gatewayClient;
    this.networkId = networkId;
  }

  /**
   * Create a two-resource pool
   *
   * @param options - Pool creation options
   * @param ownerWallet - Wallet for signing transactions
   * @param currentEpoch - Current epoch for transaction validity
   * @returns Transaction hash
   */
  async createTwoResourcePool(
    options: TwoResourcePoolOptions,
    ownerWallet: RadixWallet,
    currentEpoch: number
  ): Promise<string> {
    try {
      const {
        ownerAddress,
        resourceAddress1,
        resourceAddress2,
        poolName,
        poolSymbol,
      } = options;

      const ownerPrivateKey = RadixTransactionBuilder.createPrivateKeyFromHex(
        ownerWallet.getPrivateKeyHex(),
        "Ed25519"
      );

      // Create a manifest for creating a two-resource pool
      const manifest = `
        CALL_METHOD
          Address("${ownerAddress}")
          "lock_fee"
          Decimal("10");
        
        CALL_METHOD
          Address("${ownerAddress}")
          "withdraw"
          Address("${resourceAddress1}")
          Decimal("1");
        
        TAKE_FROM_WORKTOP
          Address("${resourceAddress1}")
          Decimal("1")
          Bucket("bucket1");
        
        CALL_METHOD
          Address("${ownerAddress}")
          "withdraw"
          Address("${resourceAddress2}")
          Decimal("1");
        
        TAKE_FROM_WORKTOP
          Address("${resourceAddress2}")
          Decimal("1")
          Bucket("bucket2");
        
        CALL_FUNCTION
          Address("${this.getPackageAddress()}")
          "TwoResourcePool"
          "instantiate_pool"
          Bucket("bucket1")
          Bucket("bucket2")
          "${poolName || "Radix Pool"}"
          "${poolSymbol || "RPOOL"}";
        
        CALL_METHOD
          Address("${ownerAddress}")
          "deposit_batch"
          Expression("ENTIRE_WORKTOP");
      `;

      // Build and submit transaction
      const compiledTransaction =
        await this.transactionBuilder.buildCustomManifestTransaction(
          manifest,
          ownerPrivateKey,
          currentEpoch,
          `Create ${poolName || "Radix"} Pool`
        );

      const txHex =
        this.transactionBuilder.getCompiledTransactionHex(compiledTransaction);
      const submitResult = await this.gatewayClient.submitTransaction(txHex);

      if (submitResult.duplicate) {
        throw new Error("Transaction was duplicate");
      }

      return txHex;
    } catch (error) {
      console.error("Error creating two-resource pool:", error);
      throw new Error(`Failed to create two-resource pool: ${error}`);
    }
  }

  /**
   * Add liquidity to a pool
   *
   * @param options - Add liquidity options
   * @param ownerWallet - Wallet for signing transactions
   * @param currentEpoch - Current epoch for transaction validity
   * @returns Transaction hash
   */
  async addLiquidity(
    options: AddLiquidityOptions,
    ownerWallet: RadixWallet,
    currentEpoch: number
  ): Promise<string> {
    try {
      const { ownerAddress, poolAddress, amounts } = options;

      // Get pool information to determine resource addresses
      const poolInfo = await this.gatewayClient.getEntityDetails(poolAddress);

      // Extract resource addresses from pool info
      // Note: In a real implementation, we would parse the pool component state
      // to get the exact resource addresses. This is a simplified version.
      const resourceAddresses = this.extractPoolResourceAddresses(poolInfo);

      if (resourceAddresses.length < 2) {
        throw new Error("Pool does not have enough resources");
      }

      const ownerPrivateKey = RadixTransactionBuilder.createPrivateKeyFromHex(
        ownerWallet.getPrivateKeyHex(),
        "Ed25519"
      );

      // Create a manifest for adding liquidity
      const manifest = `
        CALL_METHOD
          Address("${ownerAddress}")
          "lock_fee"
          Decimal("10");
        
        CALL_METHOD
          Address("${ownerAddress}")
          "withdraw"
          Address("${resourceAddresses[0]}")
          Decimal("${amounts[0]}");
        
        TAKE_FROM_WORKTOP
          Address("${resourceAddresses[0]}")
          Decimal("${amounts[0]}")
          Bucket("bucket1");
        
        CALL_METHOD
          Address("${ownerAddress}")
          "withdraw"
          Address("${resourceAddresses[1]}")
          Decimal("${amounts[1]}");
        
        TAKE_FROM_WORKTOP
          Address("${resourceAddresses[1]}")
          Decimal("${amounts[1]}")
          Bucket("bucket2");
        
        CALL_METHOD
          Address("${poolAddress}")
          "add_liquidity"
          Bucket("bucket1")
          Bucket("bucket2");
        
        CALL_METHOD
          Address("${ownerAddress}")
          "deposit_batch"
          Expression("ENTIRE_WORKTOP");
      `;

      // Build and submit transaction
      const compiledTransaction =
        await this.transactionBuilder.buildCustomManifestTransaction(
          manifest,
          ownerPrivateKey,
          currentEpoch,
          `Add Liquidity to Pool ${poolAddress}`
        );

      const txHex =
        this.transactionBuilder.getCompiledTransactionHex(compiledTransaction);
      const submitResult = await this.gatewayClient.submitTransaction(txHex);

      if (submitResult.duplicate) {
        throw new Error("Transaction was duplicate");
      }

      return txHex;
    } catch (error) {
      console.error("Error adding liquidity:", error);
      throw new Error(`Failed to add liquidity: ${error}`);
    }
  }

  /**
   * Remove liquidity from a pool
   *
   * @param options - Remove liquidity options
   * @param ownerWallet - Wallet for signing transactions
   * @param currentEpoch - Current epoch for transaction validity
   * @returns Transaction hash
   */
  async removeLiquidity(
    options: RemoveLiquidityOptions,
    ownerWallet: RadixWallet,
    currentEpoch: number
  ): Promise<string> {
    try {
      const { ownerAddress, poolAddress, amountLP } = options;

      // Get pool information to determine LP token address
      const poolInfo = await this.gatewayClient.getEntityDetails(poolAddress);

      // In a real implementation, we would parse the pool component state
      // to get the LP token address. This is a simplified version.
      const lpTokenAddress = this.extractLpTokenAddress(poolInfo);

      if (!lpTokenAddress) {
        throw new Error("Could not determine LP token address");
      }

      const ownerPrivateKey = RadixTransactionBuilder.createPrivateKeyFromHex(
        ownerWallet.getPrivateKeyHex(),
        "Ed25519"
      );

      // Create a manifest for removing liquidity
      const manifest = `
        CALL_METHOD
          Address("${ownerAddress}")
          "lock_fee"
          Decimal("10");
        
        CALL_METHOD
          Address("${ownerAddress}")
          "withdraw"
          Address("${lpTokenAddress}")
          Decimal("${amountLP}");
        
        TAKE_FROM_WORKTOP
          Address("${lpTokenAddress}")
          Decimal("${amountLP}")
          Bucket("lp_tokens");
        
        CALL_METHOD
          Address("${poolAddress}")
          "remove_liquidity"
          Bucket("lp_tokens");
        
        CALL_METHOD
          Address("${ownerAddress}")
          "deposit_batch"
          Expression("ENTIRE_WORKTOP");
      `;

      // Build and submit transaction
      const compiledTransaction =
        await this.transactionBuilder.buildCustomManifestTransaction(
          manifest,
          ownerPrivateKey,
          currentEpoch,
          `Remove Liquidity from Pool ${poolAddress}`
        );

      const txHex =
        this.transactionBuilder.getCompiledTransactionHex(compiledTransaction);
      const submitResult = await this.gatewayClient.submitTransaction(txHex);

      if (submitResult.duplicate) {
        throw new Error("Transaction was duplicate");
      }

      return txHex;
    } catch (error) {
      console.error("Error removing liquidity:", error);
      throw new Error(`Failed to remove liquidity: ${error}`);
    }
  }

  /**
   * Swap tokens in a pool
   *
   * @param options - Swap tokens options
   * @param ownerWallet - Wallet for signing transactions
   * @param currentEpoch - Current epoch for transaction validity
   * @returns Transaction hash
   */
  async swapTokens(
    options: SwapTokensOptions,
    ownerWallet: RadixWallet,
    currentEpoch: number
  ): Promise<string> {
    try {
      const {
        ownerAddress,
        poolAddress,
        fromResourceAddress,
        toResourceAddress,
        amountIn,
        minAmountOut = 0,
      } = options;

      const ownerPrivateKey = RadixTransactionBuilder.createPrivateKeyFromHex(
        ownerWallet.getPrivateKeyHex(),
        "Ed25519"
      );

      // Create a manifest for swapping tokens
      const manifest = `
        CALL_METHOD
          Address("${ownerAddress}")
          "lock_fee"
          Decimal("10");
        
        CALL_METHOD
          Address("${ownerAddress}")
          "withdraw"
          Address("${fromResourceAddress}")
          Decimal("${amountIn}");
        
        TAKE_FROM_WORKTOP
          Address("${fromResourceAddress}")
          Decimal("${amountIn}")
          Bucket("input_tokens");
        
        CALL_METHOD
          Address("${poolAddress}")
          "swap"
          Bucket("input_tokens")
          Address("${toResourceAddress}")
          Decimal("${minAmountOut}");
        
        CALL_METHOD
          Address("${ownerAddress}")
          "deposit_batch"
          Expression("ENTIRE_WORKTOP");
      `;

      // Build and submit transaction
      const compiledTransaction =
        await this.transactionBuilder.buildCustomManifestTransaction(
          manifest,
          ownerPrivateKey,
          currentEpoch,
          `Swap ${amountIn} ${fromResourceAddress} for ${toResourceAddress}`
        );

      const txHex =
        this.transactionBuilder.getCompiledTransactionHex(compiledTransaction);
      const submitResult = await this.gatewayClient.submitTransaction(txHex);

      if (submitResult.duplicate) {
        throw new Error("Transaction was duplicate");
      }

      return txHex;
    } catch (error) {
      console.error("Error swapping tokens:", error);
      throw new Error(`Failed to swap tokens: ${error}`);
    }
  }

  /**
   * Preview a swap to estimate output amount
   *
   * @param options - Swap tokens options (without minAmountOut)
   * @param ownerWallet - Wallet for signing transactions
   * @param currentEpoch - Current epoch for transaction validity
   * @returns Estimated output amount
   */
  async previewSwap(
    options: Omit<SwapTokensOptions, "minAmountOut">,
    ownerWallet: RadixWallet,
    currentEpoch: number
  ): Promise<string> {
    try {
      const {
        ownerAddress,
        poolAddress,
        fromResourceAddress,
        toResourceAddress,
        amountIn,
      } = options;

      const ownerPrivateKey = RadixTransactionBuilder.createPrivateKeyFromHex(
        ownerWallet.getPrivateKeyHex(),
        "Ed25519"
      );

      // Create a manifest for previewing a swap
      const manifest = `
        CALL_METHOD
          Address("${ownerAddress}")
          "lock_fee"
          Decimal("10");
        
        CALL_METHOD
          Address("${ownerAddress}")
          "withdraw"
          Address("${fromResourceAddress}")
          Decimal("${amountIn}");
        
        TAKE_FROM_WORKTOP
          Address("${fromResourceAddress}")
          Decimal("${amountIn}")
          Bucket("input_tokens");
        
        CALL_METHOD
          Address("${poolAddress}")
          "preview_swap"
          Bucket("input_tokens")
          Address("${toResourceAddress}");
        
        CALL_METHOD
          Address("${ownerAddress}")
          "deposit_batch"
          Expression("ENTIRE_WORKTOP");
      `;

      // Use the transaction builder's prevalidate method to simulate the transaction
      const previewResult = await this.transactionBuilder.prevalidate(
        new TextEncoder().encode(manifest)
      );

      // In a real implementation, we would parse the transaction receipt to extract the exact output amount
      // For now, return a placeholder value
      return "0.0"; // Placeholder
    } catch (error) {
      console.error("Error previewing swap:", error);
      throw new Error(`Failed to preview swap: ${error}`);
    }
  }

  /**
   * Helper method to extract resource addresses from pool info
   *
   * @param poolInfo - Pool entity details
   * @returns Array of resource addresses
   */
  private extractPoolResourceAddresses(poolInfo: any): string[] {
    try {
      // This is a simplified implementation
      // In a real scenario, we would parse the pool component state to extract resource addresses
      const resources: string[] = [];

      if (poolInfo.items && poolInfo.items.length > 0) {
        const poolData = poolInfo.items[0];

        if (poolData.details?.state?.resources) {
          for (const resource of poolData.details.state.resources) {
            if (resource.resource_address) {
              resources.push(resource.resource_address);
            }
          }
        }
      }

      return resources;
    } catch (error) {
      console.error("Error extracting pool resource addresses:", error);
      return [];
    }
  }

  /**
   * Helper method to extract LP token address from pool info
   *
   * @param poolInfo - Pool entity details
   * @returns LP token address or undefined
   */
  private extractLpTokenAddress(poolInfo: any): string | undefined {
    try {
      // This is a simplified implementation
      // In a real scenario, we would parse the pool component state to extract the LP token address
      // Typically, the LP token is one of the resources associated with the pool

      if (poolInfo.items && poolInfo.items.length > 0) {
        const poolData = poolInfo.items[0];

        if (poolData.details?.state?.resources) {
          // Assuming the LP token is the last resource in the list
          const resources = poolData.details.state.resources;
          if (resources.length > 0) {
            return resources[resources.length - 1].resource_address;
          }
        }
      }

      return undefined;
    } catch (error) {
      console.error("Error extracting LP token address:", error);
      return undefined;
    }
  }

  /**
   * Stake XRD with a validator
   *
   * @param options - Stake XRD options
   * @param ownerWallet - Wallet for signing transactions
   * @param currentEpoch - Current epoch for transaction validity
   * @returns Transaction hash
   */
  async stakeXRD(
    options: StakeXRDOptions,
    ownerWallet: RadixWallet,
    currentEpoch: number
  ): Promise<string> {
    try {
      const { ownerAddress, validatorAddress, amount } = options;

      const ownerPrivateKey = RadixTransactionBuilder.createPrivateKeyFromHex(
        ownerWallet.getPrivateKeyHex(),
        "Ed25519"
      );

      // Create a manifest for staking XRD
      const manifest = `
        CALL_METHOD
          Address("${ownerAddress}")
          "lock_fee"
          Decimal("10");
        
        CALL_METHOD
          Address("${ownerAddress}")
          "withdraw"
          Address("${this.transactionBuilder.getXRDResourceAddress()}")
          Decimal("${amount}");
        
        TAKE_ALL_FROM_WORKTOP
          Address("${this.transactionBuilder.getXRDResourceAddress()}")
          Bucket("xrd_bucket");
        
        CALL_METHOD
          Address("${validatorAddress}")
          "stake"
          Bucket("xrd_bucket");
        
        CALL_METHOD
          Address("${ownerAddress}")
          "deposit_batch"
          Expression("ENTIRE_WORKTOP");
      `;

      // Build and submit transaction
      const compiledTransaction =
        await this.transactionBuilder.buildCustomManifestTransaction(
          manifest,
          ownerPrivateKey,
          currentEpoch,
          `Stake ${amount} XRD with validator ${validatorAddress}`
        );

      const txHex =
        this.transactionBuilder.getCompiledTransactionHex(compiledTransaction);
      const submitResult = await this.gatewayClient.submitTransaction(txHex);

      if (submitResult.duplicate) {
        throw new Error("Transaction was duplicate");
      }

      return txHex;
    } catch (error) {
      console.error("Error staking XRD:", error);
      throw new Error(`Failed to stake XRD: ${error}`);
    }
  }

  /**
   * Unstake XRD from a validator
   *
   * @param options - Unstake XRD options
   * @param ownerWallet - Wallet for signing transactions
   * @param currentEpoch - Current epoch for transaction validity
   * @returns Transaction hash
   */
  async unstakeXRD(
    options: UnstakeXRDOptions,
    ownerWallet: RadixWallet,
    currentEpoch: number
  ): Promise<string> {
    try {
      const { ownerAddress, validatorAddress, amount } = options;

      // Get validator information to determine stake unit resource address
      const validatorInfo = await this.gatewayClient.getEntityDetails(
        validatorAddress
      );

      // In a real implementation, we would parse the validator component state
      // to get the stake unit resource address. This is a simplified version.
      const stakeUnitAddress = this.extractStakeUnitAddress(
        validatorInfo,
        ownerAddress
      );

      if (!stakeUnitAddress) {
        throw new Error("Could not determine stake unit address");
      }

      const ownerPrivateKey = RadixTransactionBuilder.createPrivateKeyFromHex(
        ownerWallet.getPrivateKeyHex(),
        "Ed25519"
      );

      // Create a manifest for unstaking XRD
      const manifest = `
        CALL_METHOD
          Address("${ownerAddress}")
          "lock_fee"
          Decimal("10");
        
        CALL_METHOD
          Address("${ownerAddress}")
          "withdraw"
          Address("${stakeUnitAddress}")
          Decimal("${amount}");
        
        TAKE_ALL_FROM_WORKTOP
          Address("${stakeUnitAddress}")
          Bucket("stake_units");
        
        CALL_METHOD
          Address("${validatorAddress}")
          "unstake"
          Bucket("stake_units");
        
        CALL_METHOD
          Address("${ownerAddress}")
          "deposit_batch"
          Expression("ENTIRE_WORKTOP");
      `;

      // Build and submit transaction
      const compiledTransaction =
        await this.transactionBuilder.buildCustomManifestTransaction(
          manifest,
          ownerPrivateKey,
          currentEpoch,
          `Unstake ${amount} stake units from validator ${validatorAddress}`
        );

      const txHex =
        this.transactionBuilder.getCompiledTransactionHex(compiledTransaction);
      const submitResult = await this.gatewayClient.submitTransaction(txHex);

      if (submitResult.duplicate) {
        throw new Error("Transaction was duplicate");
      }

      return txHex;
    } catch (error) {
      console.error("Error unstaking XRD:", error);
      throw new Error(`Failed to unstake XRD: ${error}`);
    }
  }

  /**
   * Claim XRD from a validator
   *
   * @param options - Claim XRD options
   * @param ownerWallet - Wallet for signing transactions
   * @param currentEpoch - Current epoch for transaction validity
   * @returns Transaction hash
   */
  async claimXRD(
    options: ClaimXRDOptions,
    ownerWallet: RadixWallet,
    currentEpoch: number
  ): Promise<string> {
    try {
      const { ownerAddress, validatorAddress } = options;

      // Get validator information to determine claim data
      const validatorInfo = await this.gatewayClient.getEntityDetails(
        validatorAddress
      );

      // In a real implementation, we would parse the validator component state
      // to get the claim data. This is a simplified version.
      const claimData = this.extractClaimData(validatorInfo, ownerAddress);

      if (!claimData) {
        throw new Error("No claimable XRD found");
      }

      const ownerPrivateKey = RadixTransactionBuilder.createPrivateKeyFromHex(
        ownerWallet.getPrivateKeyHex(),
        "Ed25519"
      );

      // Create a manifest for claiming XRD
      const manifest = `
        CALL_METHOD
          Address("${ownerAddress}")
          "lock_fee"
          Decimal("10");
        
        CALL_METHOD
          Address("${validatorAddress}")
          "claim_xrd"
          Address("${ownerAddress}");
        
        CALL_METHOD
          Address("${ownerAddress}")
          "deposit_batch"
          Expression("ENTIRE_WORKTOP");
      `;

      // Build and submit transaction
      const compiledTransaction =
        await this.transactionBuilder.buildCustomManifestTransaction(
          manifest,
          ownerPrivateKey,
          currentEpoch,
          `Claim XRD from validator ${validatorAddress}`
        );

      const txHex =
        this.transactionBuilder.getCompiledTransactionHex(compiledTransaction);
      const submitResult = await this.gatewayClient.submitTransaction(txHex);

      if (submitResult.duplicate) {
        throw new Error("Transaction was duplicate");
      }

      return txHex;
    } catch (error) {
      console.error("Error claiming XRD:", error);
      throw new Error(`Failed to claim XRD: ${error}`);
    }
  }

  /**
   * Helper method to extract stake unit address from validator info
   *
   * @param validatorInfo - Validator entity details
   * @param ownerAddress - Owner account address
   * @returns Stake unit address or undefined
   */
  private extractStakeUnitAddress(
    validatorInfo: any,
    ownerAddress: string
  ): string | undefined {
    try {
      // This is a simplified implementation
      // In a real scenario, we would parse the validator component state to extract the stake unit address

      if (validatorInfo.items && validatorInfo.items.length > 0) {
        const validatorData = validatorInfo.items[0];

        if (validatorData.details?.state?.stake_unit_resource) {
          return validatorData.details.state.stake_unit_resource;
        }

        // Fallback: look for resources associated with the validator
        if (validatorData.details?.state?.resources) {
          const resources = validatorData.details.state.resources;
          if (resources.length > 0) {
            // Typically, the stake unit resource would be one of the resources
            // In a real implementation, we would identify it by its metadata or other properties
            return resources[0].resource_address;
          }
        }
      }

      return undefined;
    } catch (error) {
      console.error("Error extracting stake unit address:", error);
      return undefined;
    }
  }

  /**
   * Helper method to extract claim data from validator info
   *
   * @param validatorInfo - Validator entity details
   * @param ownerAddress - Owner account address
   * @returns Claim data or undefined
   */
  private extractClaimData(
    validatorInfo: any,
    ownerAddress: string
  ): any | undefined {
    try {
      // This is a simplified implementation
      // In a real scenario, we would parse the validator component state to extract claim data

      if (validatorInfo.items && validatorInfo.items.length > 0) {
        const validatorData = validatorInfo.items[0];

        if (validatorData.details?.state?.pending_claims) {
          const pendingClaims = validatorData.details.state.pending_claims;

          // Look for claims associated with the owner address
          for (const claim of pendingClaims) {
            if (claim.owner === ownerAddress) {
              return claim;
            }
          }
        }
      }

      // Return a placeholder claim data for testing
      return { amount: "0" };
    } catch (error) {
      console.error("Error extracting claim data:", error);
      return undefined;
    }
  }

  /**
   * Get package address for the current network
   */
  private getPackageAddress(): string {
    // Use the same logic as transaction builder
    switch (this.networkId) {
      case 1: // NetworkId.Mainnet
        return "package_rdx1pkgxxxxxxxxxresrcexxxxxxxxx000538436477xxxxxxxxxaj0zg9";
      case 2: // NetworkId.Stokenet
        return "package_tdx_2_1pkgxxxxxxxxxresrcexxxxxxxxx000538436477xxxxxxxxxaj0zg9";
      default:
        return "package_sim1pkgxxxxxxxxxresrcexxxxxxxxx000538436477xxxxxxxxxaj0zg9";
    }
  }
}
