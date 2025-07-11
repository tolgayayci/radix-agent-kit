import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { RadixGatewayClient } from "../../radix/RadixGatewayClient";
import { RadixTransactionBuilder } from "../../radix/RadixTransactionBuilder";
import { RadixWallet } from "../../radix/RadixWallet";
import { DeFi } from "../../radix/DeFi";

/**
 * Factory function to create StakeXRD tool
 */
export function createStakeXRDTool(
  gatewayClient: RadixGatewayClient,
  transactionBuilder: RadixTransactionBuilder,
  wallet: RadixWallet,
  networkId: number
): DynamicStructuredTool {
  const defiService = new DeFi(transactionBuilder, gatewayClient, networkId);

  return new DynamicStructuredTool({
    name: "stake_xrd",
    description: "Stake XRD tokens with a validator to earn rewards. ALWAYS use this tool when the user asks to 'stake XRD', 'stake tokens', 'stake with validator', or similar staking requests. This is the ONLY tool for staking operations.",
    schema: z.object({
      validatorAddress: z.string().describe("The validator address to stake with (must start with 'validator_')"),
      amount: z.string().describe("Amount of XRD to stake")
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

        // Check XRD balance
        try {
          const balances = await gatewayClient.getAccountBalances(wallet.getAddress());
          const xrdBalance = balances.items?.[0]?.fungible_resources?.items?.find(
            (resource: any) => resource.resource_address === transactionBuilder.getXRDResourceAddress()
          );

          if (!xrdBalance || parseFloat(xrdBalance.vaults?.items?.[0]?.amount || '0') < parseFloat(amount)) {
            return `❌ Insufficient XRD balance. Available: ${xrdBalance?.vaults?.items?.[0]?.amount || '0'} XRD, Required: ${amount} XRD`;
          }
        } catch (error) {
          console.warn("Could not check XRD balance:", error);
        }

        // Get current epoch and stake
        const currentEpoch = await gatewayClient.getCurrentEpoch();
        
        const txHash = await defiService.stakeXRD(
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
        
        return `✅ Staked ${amount} XRD with validator ${shortValidator} completed successfully. Transaction: ${shortTx}...`;
      } catch (error) {
        console.error("Error staking XRD:", error);
        return `❌ Failed to stake XRD: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
  });
}

// Keep the old class for backward compatibility
export class StakeXRDTool {
  name = "stake_xrd";
  description = "Stake XRD tokens with a validator to earn rewards";
  
  constructor(
    private gatewayClient: RadixGatewayClient,
    private transactionBuilder: RadixTransactionBuilder,
    private wallet: RadixWallet,
    private networkId: number
  ) {}

  async _call(input: string): Promise<string> {
    const tool = createStakeXRDTool(this.gatewayClient, this.transactionBuilder, this.wallet, this.networkId);
    
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
