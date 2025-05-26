import { RadixTool } from "./RadixTool";
import { RadixGatewayClient } from "../../radix/RadixGatewayClient";
import { RadixTransactionBuilder } from "../../radix/RadixTransactionBuilder";
import { RadixWallet } from "../../radix/RadixWallet";

/**
 * Tool for swapping tokens in pools
 */
export class SwapTokensTool extends RadixTool {
  name = "swap_tokens";
  description =
    "Swap tokens in a pool. Input format: 'poolAddress,fromResourceAddress,toResourceAddress,amountIn[,minAmountOut]' or JSON: {'poolAddress': 'component_...', 'fromResourceAddress': 'resource_...', 'toResourceAddress': 'resource_...', 'amountIn': '100', 'minAmountOut': '95'}";

  constructor(
    gatewayClient: RadixGatewayClient,
    transactionBuilder: RadixTransactionBuilder,
    wallet: RadixWallet,
    networkId: number
  ) {
    super(gatewayClient, transactionBuilder, wallet, networkId);
  }

  async _call(input: string): Promise<string> {
    try {
      // Validate input before parsing
      if (!input || input.trim().length === 0) {
        return "❌ Invalid input. Please provide pool and resource addresses with amount.\nFormat: 'poolAddress,fromResourceAddress,toResourceAddress,amountIn[,minAmountOut]' or JSON: {'poolAddress': 'component_...', 'fromResourceAddress': 'resource_...', 'toResourceAddress': 'resource_...', 'amountIn': '100', 'minAmountOut': '95'}";
      }

      let poolAddress: string;
      let fromResourceAddress: string;
      let toResourceAddress: string;
      let amountIn: string;
      let minAmountOut: string = "0"; // Default to 0 (no slippage protection)

      // Parse input
      const parsed = this.parseInput(input);

      if (parsed.parts && parsed.parts.length > 0) {
        // Handle comma-separated format
        const parts = parsed.parts;
        if (parts.length < 4) {
          return "❌ Invalid input format. Expected: 'poolAddress,fromResourceAddress,toResourceAddress,amountIn[,minAmountOut]'";
        }

        poolAddress = parts[0];
        fromResourceAddress = parts[1];
        toResourceAddress = parts[2];
        amountIn = parts[3];
        if (parts[4]) {
          minAmountOut = parts[4];
        }
      } else {
        // Handle JSON format
        if (
          !parsed.poolAddress ||
          !parsed.fromResourceAddress ||
          !parsed.toResourceAddress ||
          !parsed.amountIn
        ) {
          return "❌ Missing required parameters: poolAddress, fromResourceAddress, toResourceAddress, and amountIn";
        }

        poolAddress = parsed.poolAddress;
        fromResourceAddress = parsed.fromResourceAddress;
        toResourceAddress = parsed.toResourceAddress;
        amountIn = parsed.amountIn;
        if (parsed.minAmountOut) {
          minAmountOut = parsed.minAmountOut;
        }
      }

      // Validate inputs
      if (!this.isValidAddress(poolAddress)) {
        return `❌ Invalid pool address: ${poolAddress}`;
      }

      if (!this.isValidAddress(fromResourceAddress)) {
        return `❌ Invalid from resource address: ${fromResourceAddress}`;
      }

      if (!this.isValidAddress(toResourceAddress)) {
        return `❌ Invalid to resource address: ${toResourceAddress}`;
      }

      // Parse and validate amounts
      const parsedAmountIn = this.parseAmount(amountIn);
      const parsedMinAmountOut = this.parseAmount(minAmountOut);

      // Get current epoch
      const currentEpoch = await this.getCurrentEpoch();

      // Perform the swap using the DeFi service
      const txHash = await this.defiService.swapTokens(
        {
          ownerAddress: this.getAgentAddress(),
          poolAddress: poolAddress,
          fromResourceAddress: fromResourceAddress,
          toResourceAddress: toResourceAddress,
          amountIn: parsedAmountIn,
          minAmountOut: parsedMinAmountOut,
        },
        this.wallet,
        currentEpoch
      );

      // Get token symbols for display
      let fromSymbol = "tokens";
      let toSymbol = "tokens";

      if (fromResourceAddress === this.getXRDResourceAddress()) {
        fromSymbol = "XRD";
      }
      if (toResourceAddress === this.getXRDResourceAddress()) {
        toSymbol = "XRD";
      }

      const poolDisplay = `${poolAddress.slice(0, 16)}...`;

      return this.formatTransactionResult(
        txHash,
        `Swapped ${this.formatBalance(
          parsedAmountIn,
          fromSymbol
        )} for ${toSymbol} in pool ${poolDisplay}`
      );
    } catch (error) {
      console.error("Error swapping tokens:", error);
      return `❌ Failed to swap tokens: ${this.formatError(error)}`;
    }
  }
}
