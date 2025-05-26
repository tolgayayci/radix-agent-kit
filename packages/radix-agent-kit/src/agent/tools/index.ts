// Import dependencies
import { RadixGatewayClient } from "../../radix/RadixGatewayClient";
import { RadixTransactionBuilder } from "../../radix/RadixTransactionBuilder";
import { RadixWallet } from "../../radix/RadixWallet";
import { DynamicStructuredTool } from "@langchain/core/tools";

// Import base tool class (keeping for backward compatibility)
import { RadixTool } from "./RadixTool";

// Import all tool factory functions
import { createGetAccountInfoTool } from "./GetAccountInfoTool";
import { createGetBalancesTool } from "./GetBalancesTool";
import { createTransferTokensTool } from "./TransferTokensTool";
import { CreateFungibleResourceTool } from "./CreateFungibleResourceTool";
import { StakeXRDTool } from "./StakeXRDTool";
import { AddLiquidityTool } from "./AddLiquidityTool";
import { SwapTokensTool } from "./SwapTokensTool";
import { CallComponentMethodTool } from "./CallComponentMethodTool";
import { createGetEpochTool } from "./GetEpochTool";

// Export base tool class (keeping for backward compatibility)
export { RadixTool } from "./RadixTool";

// Export all tool implementations
export { createGetAccountInfoTool } from "./GetAccountInfoTool";
export { createGetBalancesTool } from "./GetBalancesTool";
export { createTransferTokensTool } from "./TransferTokensTool";
export { CreateFungibleResourceTool } from "./CreateFungibleResourceTool";
export { StakeXRDTool } from "./StakeXRDTool";
export { AddLiquidityTool } from "./AddLiquidityTool";
export { SwapTokensTool } from "./SwapTokensTool";
export { CallComponentMethodTool } from "./CallComponentMethodTool";
export { createGetEpochTool } from "./GetEpochTool";

/**
 * Wrapper function to add error handling and retry logic to tools
 */
function wrapToolWithErrorHandling(tool: DynamicStructuredTool): DynamicStructuredTool {
  const originalFunc = tool.func;
  
  return new DynamicStructuredTool({
    name: tool.name,
    description: tool.description,
    schema: tool.schema,
    func: async (input: any) => {
      const maxRetries = 2;
      let lastError: Error | null = null;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`🔧 Executing tool: ${tool.name} (attempt ${attempt}/${maxRetries})`);
          const result = await originalFunc(input);
          
          if (result && typeof result === 'string' && result.trim().length > 0) {
            console.log(`✅ Tool ${tool.name} executed successfully`);
            return result;
          } else {
            throw new Error(`Tool ${tool.name} returned empty or invalid result`);
          }
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          console.warn(`⚠️ Tool ${tool.name} failed on attempt ${attempt}: ${lastError.message}`);
          
          if (attempt === maxRetries) {
            break;
          }
          
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
      
      // If all retries failed, return a helpful error message
      const errorMessage = lastError?.message || 'Unknown error';
      console.error(`❌ Tool ${tool.name} failed after ${maxRetries} attempts: ${errorMessage}`);
      
      // Return a structured error response instead of throwing
      return `❌ I encountered an issue with the ${tool.name} operation: ${errorMessage}. This might be due to network connectivity or the Radix Gateway being temporarily unavailable. Please try again in a moment.`;
    }
  });
}

/**
 * Factory function to create all default Radix tools with enhanced error handling
 */
export function createDefaultRadixTools(
  gatewayClient: RadixGatewayClient,
  transactionBuilder: RadixTransactionBuilder,
  wallet: RadixWallet,
  networkId: number
): DynamicStructuredTool[] {
  try {
    const tools = [
      createGetAccountInfoTool(
        gatewayClient,
        transactionBuilder,
        wallet,
        networkId
      ),
      createGetBalancesTool(gatewayClient, transactionBuilder, wallet, networkId),
      createTransferTokensTool(gatewayClient, transactionBuilder, wallet, networkId),
      createGetEpochTool(gatewayClient, transactionBuilder, wallet, networkId),
      // TODO: Convert these to factory functions as well
      new CreateFungibleResourceTool(
        gatewayClient,
        transactionBuilder,
        wallet,
        networkId
      ) as any,
      new StakeXRDTool(gatewayClient, transactionBuilder, wallet, networkId) as any,
      new AddLiquidityTool(gatewayClient, transactionBuilder, wallet, networkId) as any,
      new SwapTokensTool(gatewayClient, transactionBuilder, wallet, networkId) as any,
      new CallComponentMethodTool(
        gatewayClient,
        transactionBuilder,
        wallet,
        networkId
      ) as any,
    ];

    // Wrap all tools with error handling
    const wrappedTools = tools.map(tool => wrapToolWithErrorHandling(tool));
    
    console.log(`🛠️ Created ${wrappedTools.length} Radix tools with error handling`);
    return wrappedTools;
  } catch (error) {
    console.error("Error creating default Radix tools:", error);
    return [];
  }
}

/**
 * Get tool names for easy reference
 */
export const RADIX_TOOL_NAMES = {
  GET_ACCOUNT_INFO: "get_account_info",
  GET_BALANCES: "get_balances",
  TRANSFER_TOKENS: "transfer_tokens",
  GET_EPOCH: "get_epoch",
  CREATE_FUNGIBLE_RESOURCE: "create_fungible_resource",
  STAKE_XRD: "stake_xrd",
  ADD_LIQUIDITY: "add_liquidity",
  SWAP_TOKENS: "swap_tokens",
  CALL_COMPONENT_METHOD: "call_component_method",
} as const;
