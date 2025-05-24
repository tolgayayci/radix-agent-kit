// Import dependencies
import { RadixGatewayClient } from "../../radix/RadixGatewayClient";
import { RadixTransactionBuilder } from "../../radix/RadixTransactionBuilder";
import { RadixWallet } from "../../radix/RadixWallet";

// Import base tool class
import { RadixTool } from "./RadixTool";

// Import all tool implementations
import { GetAccountInfoTool } from "./GetAccountInfoTool";
import { GetBalancesTool } from "./GetBalancesTool";
import { TransferTokensTool } from "./TransferTokensTool";
import { CreateFungibleResourceTool } from "./CreateFungibleResourceTool";
import { StakeXRDTool } from "./StakeXRDTool";
import { AddLiquidityTool } from "./AddLiquidityTool";
import { SwapTokensTool } from "./SwapTokensTool";
import { CallComponentMethodTool } from "./CallComponentMethodTool";

// Export base tool class
export { RadixTool } from "./RadixTool";

// Export all tool implementations
export { GetAccountInfoTool } from "./GetAccountInfoTool";
export { GetBalancesTool } from "./GetBalancesTool";
export { TransferTokensTool } from "./TransferTokensTool";
export { CreateFungibleResourceTool } from "./CreateFungibleResourceTool";
export { StakeXRDTool } from "./StakeXRDTool";
export { AddLiquidityTool } from "./AddLiquidityTool";
export { SwapTokensTool } from "./SwapTokensTool";
export { CallComponentMethodTool } from "./CallComponentMethodTool";

/**
 * Factory function to create all default Radix tools
 */
export function createDefaultRadixTools(
  gatewayClient: RadixGatewayClient,
  transactionBuilder: RadixTransactionBuilder,
  wallet: RadixWallet,
  networkId: number
): RadixTool[] {
  return [
    new GetAccountInfoTool(
      gatewayClient,
      transactionBuilder,
      wallet,
      networkId
    ),
    new GetBalancesTool(gatewayClient, transactionBuilder, wallet, networkId),
    new TransferTokensTool(
      gatewayClient,
      transactionBuilder,
      wallet,
      networkId
    ),
    new CreateFungibleResourceTool(
      gatewayClient,
      transactionBuilder,
      wallet,
      networkId
    ),
    new StakeXRDTool(gatewayClient, transactionBuilder, wallet, networkId),
    new AddLiquidityTool(gatewayClient, transactionBuilder, wallet, networkId),
    new SwapTokensTool(gatewayClient, transactionBuilder, wallet, networkId),
    new CallComponentMethodTool(
      gatewayClient,
      transactionBuilder,
      wallet,
      networkId
    ),
  ];
}

/**
 * Get tool names for easy reference
 */
export const RADIX_TOOL_NAMES = {
  GET_ACCOUNT_INFO: "get_account_info",
  GET_BALANCES: "get_balances",
  TRANSFER_TOKENS: "transfer_tokens",
  CREATE_FUNGIBLE_RESOURCE: "create_fungible_resource",
  STAKE_XRD: "stake_xrd",
  ADD_LIQUIDITY: "add_liquidity",
  SWAP_TOKENS: "swap_tokens",
  CALL_COMPONENT_METHOD: "call_component_method",
} as const;
