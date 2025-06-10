import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { RadixGatewayClient } from "../../radix/RadixGatewayClient";
import { RadixTransactionBuilder } from "../../radix/RadixTransactionBuilder";
import { RadixWallet } from "../../radix/RadixWallet";
import { DeFi } from "../../radix/DeFi";

/**
 * Factory function to create UnstakeXRD tool
 */
export function createUnstakeXRDTool(
  gatewayClient: RadixGatewayClient,
  transactionBuilder: RadixTransactionBuilder,
  wallet: RadixWallet,
  networkId: number
): DynamicStructuredTool {
  const defiService = new DeFi(transactionBuilder, gatewayClient, networkId);

  return new DynamicStructuredTool({
    name: "unstake_xrd",
    description: "Unstake XRD tokens from a validator. ALWAYS use this tool when the user asks to 'unstake XRD', 'unstake tokens', 'unstake from validator', 'withdraw staked XRD', or similar unstaking requests. This is the ONLY tool for unstaking operations.",
    schema: z.object({
      validatorAddress: z.string().describe("The validator address to unstake from (must start with 'validator_')"),
      amount: z.string().describe("Amount of stake units to unstake")
    }),
    func: async ({ validatorAddress, amount }) => {
      try {
        // Validate inputs
        if (!validatorAddress || !validatorAddress.startsWith('validator_')) {
          return `❌ Invalid validator address: ${validatorAddress}. Must start with 'validator_'`;
        }

        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
          return `❌ Invalid amount: ${amount}. Must be a positive number`;
        }

        // Get current epoch and unstake
        const currentEpoch = await gatewayClient.getCurrentEpoch();
        
        const txHash = await defiService.unstakeXRD(
          {
            ownerAddress: wallet.getAddress(),
            validatorAddress,
            amount
          },
          wallet,
          currentEpoch
        );

        const shortValidator = `${validatorAddress.slice(0, 16)}...`;
        const shortTx = txHash.slice(0, 20);
        
        return `✅ Unstaked ${amount} XRD stake units from validator ${shortValidator} completed successfully. Transaction: ${shortTx}...`;
      } catch (error) {
        console.error("Error unstaking XRD:", error);
        return `❌ Failed to unstake XRD: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
  });
}

// Keep the old class for backward compatibility
export class UnstakeXRDTool {
  name = "unstake_xrd";
  description = "Unstake XRD tokens from a validator";
  
  constructor(
    private gatewayClient: RadixGatewayClient,
    private transactionBuilder: RadixTransactionBuilder,
    private wallet: RadixWallet,
    private networkId: number
  ) {}

  async _call(input: string): Promise<string> {
    const tool = createUnstakeXRDTool(this.gatewayClient, this.transactionBuilder, this.wallet, this.networkId);
    
    // Parse input format: "validator,amount" or JSON
    try {
      let validatorAddress: string;
      let amount: string;

      if (input.includes('{')) {
        const parsed = JSON.parse(input);
        validatorAddress = parsed.validatorAddress;
        amount = parsed.amount;
      } else {
        const parts = input.split(',');
        if (parts.length < 2) return "❌ Invalid input format. Expected: 'validatorAddress,amount'";
        validatorAddress = parts[0].trim();
        amount = parts[1].trim();
      }

      return await tool.func({ validatorAddress, amount });
    } catch (error) {
      return `❌ Failed to parse input: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
} 