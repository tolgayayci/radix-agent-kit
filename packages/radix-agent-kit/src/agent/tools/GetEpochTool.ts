import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { RadixGatewayClient } from "../../radix/RadixGatewayClient";
import { RadixTransactionBuilder } from "../../radix/RadixTransactionBuilder";
import { RadixWallet } from "../../radix/RadixWallet";

/**
 * Tool for getting current epoch information from the Radix network
 */
export function createGetEpochTool(
  gatewayClient: RadixGatewayClient,
  transactionBuilder: RadixTransactionBuilder,
  wallet: RadixWallet,
  networkId: number
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "get_epoch",
    description: "Use this tool when users ask about 'current epoch', 'what epoch', 'epoch number', or network timing information. Gets the current epoch number from the Radix network which is used for transaction validity windows. Call this for queries like 'what is the current epoch', 'current epoch number', 'what epoch are we in', etc.",
    schema: z.object({
      // No parameters needed - just gets current epoch
    }),
    func: async () => {
      try {
        const currentEpoch = await gatewayClient.getCurrentEpoch();
        
        return `📊 Current Radix Network Epoch: ${currentEpoch}\n\nThe epoch is used for transaction validity windows. Transactions typically use a range of current epoch + 10 to allow for network delays and processing time.`;
      } catch (error) {
        return `❌ Error retrieving current epoch: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
  });
} 