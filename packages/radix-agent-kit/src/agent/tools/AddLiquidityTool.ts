import { RadixTool } from "./RadixTool";
import { RadixGatewayClient } from "../../radix/RadixGatewayClient";
import { RadixTransactionBuilder } from "../../radix/RadixTransactionBuilder";
import { RadixWallet } from "../../radix/RadixWallet";

/**
 * Tool for adding liquidity to pools
 */
export class AddLiquidityTool extends RadixTool {
  name = "add_liquidity";
  description =
    "Add liquidity to a two-resource pool. Input format: 'poolAddress,amount1,amount2' or JSON: {'poolAddress': 'component_...', 'amount1': '100', 'amount2': '200'}";

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
        return "❌ Invalid input. Please provide pool address and amounts.\nFormat: 'poolAddress,amount1,amount2' or JSON: {'poolAddress': 'component_...', 'amount1': '100', 'amount2': '200'}";
      }

      let poolAddress: string;
      let amount1: string;
      let amount2: string;

      // Parse input
      const parsed = this.parseInput(input);

      if (parsed.parts && parsed.parts.length > 0) {
        // Handle comma-separated format
        const parts = parsed.parts;
        if (parts.length < 3) {
          return "❌ Invalid input format. Expected: 'poolAddress,amount1,amount2'";
        }

        poolAddress = parts[0];
        amount1 = parts[1];
        amount2 = parts[2];
      } else {
        // Handle JSON format
        if (!parsed.poolAddress || !parsed.amount1 || !parsed.amount2) {
          return "❌ Missing required parameters: poolAddress, amount1, and amount2";
        }

        poolAddress = parsed.poolAddress;
        amount1 = parsed.amount1;
        amount2 = parsed.amount2;
      }

      // Validate inputs
      if (!this.isValidAddress(poolAddress)) {
        return `❌ Invalid pool address: ${poolAddress}`;
      }

      // Parse and validate amounts
      const parsedAmount1 = this.parseAmount(amount1);
      const parsedAmount2 = this.parseAmount(amount2);

      // Get current epoch
      const currentEpoch = await this.getCurrentEpoch();

      // Add liquidity using the DeFi service
      const txHash = await this.defiService.addLiquidity(
        {
          ownerAddress: this.getAgentAddress(),
          poolAddress: poolAddress,
          amounts: [parsedAmount1, parsedAmount2],
        },
        this.wallet,
        currentEpoch
      );

      const poolDisplay = `${poolAddress.slice(0, 16)}...`;

      return this.formatTransactionResult(
        txHash,
        `Added liquidity (${parsedAmount1}, ${parsedAmount2}) to pool ${poolDisplay}`
      );
    } catch (error) {
      console.error("Error adding liquidity:", error);
      return `❌ Failed to add liquidity: ${this.formatError(error)}`;
    }
  }
}
