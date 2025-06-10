import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { RadixGatewayClient } from "../../radix/RadixGatewayClient";
import { RadixTransactionBuilder } from "../../radix/RadixTransactionBuilder";
import { RadixWallet } from "../../radix/RadixWallet";
import { DeFi } from "../../radix/DeFi";

/**
 * Factory function to create ClaimXRD tool
 */
export function createClaimXRDTool(
  gatewayClient: RadixGatewayClient,
  transactionBuilder: RadixTransactionBuilder,
  wallet: RadixWallet,
  networkId: number
): DynamicStructuredTool {
  const defiService = new DeFi(transactionBuilder, gatewayClient, networkId);

  return new DynamicStructuredTool({
    name: "claim_xrd",
    description: "Claim XRD rewards from a validator. ALWAYS use this tool when the user asks to 'claim rewards', 'claim XRD', 'collect staking rewards', 'claim from validator', or similar reward claiming requests. This is the ONLY tool for claiming staking rewards.",
    schema: z.object({
      validatorAddress: z.string().describe("The validator address to claim rewards from (must start with 'validator_')")
    }),
    func: async ({ validatorAddress }) => {
      try {
        // Validate inputs
        if (!validatorAddress || !validatorAddress.startsWith('validator_')) {
          return `❌ Invalid validator address: ${validatorAddress}. Must start with 'validator_'`;
        }

        // Get current epoch and claim
        const currentEpoch = await gatewayClient.getCurrentEpoch();
        
        const txHash = await defiService.claimXRD(
          {
            ownerAddress: wallet.getAddress(),
            validatorAddress
          },
          wallet,
          currentEpoch
        );

        const shortValidator = `${validatorAddress.slice(0, 16)}...`;
        const shortTx = txHash.slice(0, 20);
        
        return `✅ Claimed XRD rewards from validator ${shortValidator} completed successfully. Transaction: ${shortTx}...`;
      } catch (error) {
        console.error("Error claiming XRD:", error);
        return `❌ Failed to claim XRD: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
  });
}

// Keep the old class for backward compatibility
export class ClaimXRDTool {
  name = "claim_xrd";
  description = "Claim XRD rewards from a validator";
  
  constructor(
    private gatewayClient: RadixGatewayClient,
    private transactionBuilder: RadixTransactionBuilder,
    private wallet: RadixWallet,
    private networkId: number
  ) {}

  async _call(input: string): Promise<string> {
    const tool = createClaimXRDTool(this.gatewayClient, this.transactionBuilder, this.wallet, this.networkId);
    
    // Parse input format: "validator" or JSON
    try {
      let validatorAddress: string;

      if (input.includes('{')) {
        const parsed = JSON.parse(input);
        validatorAddress = parsed.validatorAddress;
      } else {
        validatorAddress = input.trim();
      }

      if (!validatorAddress) {
        return "❌ Invalid input. Please provide validator address.";
      }

      return await tool.func({ validatorAddress });
    } catch (error) {
      return `❌ Failed to parse input: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
} 