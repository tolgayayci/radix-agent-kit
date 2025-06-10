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
import { createCreateFungibleResourceTool } from "./CreateFungibleResourceTool";
import { createCreateNonFungibleResourceTool } from "./CreateNonFungibleResourceTool";
import { createMintFungibleResourceTool } from "./MintFungibleResourceTool";
import { createMintNonFungibleResourceTool } from "./MintNonFungibleResourceTool";
import { createStakeXRDTool } from "./StakeXRDTool";
import { createUnstakeXRDTool } from "./UnstakeXRDTool";
import { createClaimXRDTool } from "./ClaimXRDTool";
import { AddLiquidityTool } from "./AddLiquidityTool";
import { SwapTokensTool } from "./SwapTokensTool";
import { createCallComponentMethodTool } from "./CallComponentMethodTool";
import { createGetEpochTool } from "./GetEpochTool";
import { createFundStokenetWalletTool } from "./FundStokenetWalletTool";
import { createGetComponentStateTool } from "./GetComponentStateTool";

// Export base tool class (keeping for backward compatibility)
export { RadixTool } from "./RadixTool";

// Export tool factory functions
export { createGetAccountInfoTool } from "./GetAccountInfoTool";
export { createGetBalancesTool } from "./GetBalancesTool";
export { createTransferTokensTool } from "./TransferTokensTool";
export { createGetEpochTool } from "./GetEpochTool";
export { createFundStokenetWalletTool } from "./FundStokenetWalletTool";
export { createGetComponentStateTool } from "./GetComponentStateTool";
export { createCreateFungibleResourceTool } from "./CreateFungibleResourceTool";
export { createCreateNonFungibleResourceTool } from "./CreateNonFungibleResourceTool";
export { createMintFungibleResourceTool } from "./MintFungibleResourceTool";
export { createMintNonFungibleResourceTool } from "./MintNonFungibleResourceTool";
export { createCallComponentMethodTool } from "./CallComponentMethodTool";

// Export staking tool factory functions
export { createStakeXRDTool } from "./StakeXRDTool";
export { createUnstakeXRDTool } from "./UnstakeXRDTool";
export { createClaimXRDTool } from "./ClaimXRDTool";

// Export tool classes (keeping for backward compatibility)
export { StakeXRDTool } from "./StakeXRDTool";
export { UnstakeXRDTool } from "./UnstakeXRDTool";
export { ClaimXRDTool } from "./ClaimXRDTool";
export { AddLiquidityTool } from "./AddLiquidityTool";
export { SwapTokensTool } from "./SwapTokensTool";

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
      createFundStokenetWalletTool(gatewayClient, transactionBuilder, wallet, networkId),
      createGetComponentStateTool(gatewayClient, transactionBuilder, wallet, networkId),
      createCallComponentMethodTool(gatewayClient, transactionBuilder, wallet, networkId),
      createCreateFungibleResourceTool(
        gatewayClient,
        transactionBuilder,
        wallet,
        networkId
      ),
      createCreateNonFungibleResourceTool(
        gatewayClient,
        transactionBuilder,
        wallet,
        networkId
      ),
      createMintFungibleResourceTool(
        gatewayClient,
        transactionBuilder,
        wallet,
        networkId
      ),
      createMintNonFungibleResourceTool(
        gatewayClient,
        transactionBuilder,
        wallet,
        networkId
      ),
      createStakeXRDTool(gatewayClient, transactionBuilder, wallet, networkId),
      createUnstakeXRDTool(gatewayClient, transactionBuilder, wallet, networkId),
      createClaimXRDTool(gatewayClient, transactionBuilder, wallet, networkId),
      new AddLiquidityTool(gatewayClient, transactionBuilder, wallet, networkId) as any,
      new SwapTokensTool(gatewayClient, transactionBuilder, wallet, networkId) as any,
    ];

    // Temporarily disable error handling wrapper to test tools directly
    return tools;
    
    // Wrap all tools with error handling
    // const wrappedTools = tools.map(tool => wrapToolWithErrorHandling(tool));
    
    // Log successful creation
    // console.log(`🛠️ Created ${wrappedTools.length} Radix tools with error handling`);
    // return wrappedTools;
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
  FUND_STOKENET_WALLET: "fund_stokenet_wallet",
  GET_COMPONENT_STATE: "get_component_state",
  CREATE_FUNGIBLE_RESOURCE: "create_fungible_resource",
  CREATE_NON_FUNGIBLE_RESOURCE: "create_non_fungible_resource",
  MINT_FUNGIBLE_RESOURCE: "mint_fungible_resource",
  MINT_NON_FUNGIBLE_RESOURCE: "mint_non_fungible_resource",
  STAKE_XRD: "stake_xrd",
  UNSTAKE_XRD: "unstake_xrd",
  CLAIM_XRD: "claim_xrd",
  ADD_LIQUIDITY: "add_liquidity",
  SWAP_TOKENS: "swap_tokens",
  CALL_COMPONENT_METHOD: "call_component_method",
} as const;

/**
 * Wrapper function to add error handling and retry logic to tools
 * (Currently disabled for testing)
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
          const result = await originalFunc(input);
          return result;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          console.warn(`⚠️ Tool ${tool.name} failed on attempt ${attempt}: ${lastError.message}`);
          
          if (attempt === maxRetries) {
            break;
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
      
      const errorMessage = lastError?.message || 'Unknown error';
      console.error(`❌ Tool ${tool.name} failed after ${maxRetries} attempts: ${errorMessage}`);
      
      return `❌ I encountered an issue with the ${tool.name} operation: ${errorMessage}. This might be due to network connectivity or the Radix Gateway being temporarily unavailable. Please try again in a moment.`;
    }
  });
}
