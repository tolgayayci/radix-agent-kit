import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { RadixGatewayClient } from "../../radix/RadixGatewayClient";
import { RadixTransactionBuilder } from "../../radix/RadixTransactionBuilder";
import { RadixWallet } from "../../radix/RadixWallet";
import { DeFi } from "../../radix/DeFi";

/**
 * Tool for swapping tokens using Ociswap
 */
export function createSwapTokensTool(
  gatewayClient: RadixGatewayClient,
  transactionBuilder: RadixTransactionBuilder,
  wallet: RadixWallet,
  networkId: number
) {
  const defiService = new DeFi(transactionBuilder, gatewayClient, networkId);

  return new DynamicStructuredTool({
    name: "swap_tokens",
    description: "Swap tokens using Ociswap pools. Provide the pool address, token addresses, and amount to swap.",
    schema: z.object({
      poolAddress: z.string().describe("Pool component address"),
      fromResourceAddress: z.string().describe("Token address to swap from"),
      toResourceAddress: z.string().describe("Token address to swap to"),
      amountIn: z.union([z.string(), z.number()]).describe("Amount of input tokens to swap"),
      minAmountOut: z.union([z.string(), z.number()]).optional().describe("Minimum amount of output tokens expected (slippage protection)"),
    }),
    func: async (input) => {
      try {
        const { poolAddress, fromResourceAddress, toResourceAddress, amountIn, minAmountOut = 0 } = input;

        // Get the agent's wallet address
        const ownerAddress = wallet.getAddress();

        // Validate addresses format
        if (!poolAddress.startsWith("component_")) {
          return `❌ Invalid pool address format: ${poolAddress}`;
        }

        if (!fromResourceAddress.startsWith("resource_")) {
          return `❌ Invalid from resource address format: ${fromResourceAddress}`;
        }

        if (!toResourceAddress.startsWith("resource_")) {
          return `❌ Invalid to resource address format: ${toResourceAddress}`;
        }

        // Validate that we're not swapping the same token
        if (fromResourceAddress === toResourceAddress) {
          return "❌ Cannot swap a token to itself";
        }

        // Parse and validate amount
        const parsedAmountIn = parseFloat(amountIn.toString());
        const parsedMinAmountOut = parseFloat(minAmountOut.toString());
        
        if (isNaN(parsedAmountIn) || parsedAmountIn <= 0) {
          return `❌ Invalid input amount: ${amountIn}`;
        }

        if (parsedMinAmountOut < 0) {
          return `❌ Invalid minimum amount out: ${minAmountOut}`;
        }

        // Get pool information to verify this is a valid swap
        let poolInfo;
        try {
          poolInfo = await defiService.getPoolInfo(poolAddress);
        } catch (error) {
          return `❌ Could not get pool information: ${error instanceof Error ? error.message : String(error)}`;
        }

        // Verify the tokens are in the pool
        if (fromResourceAddress !== poolInfo.resource1 && fromResourceAddress !== poolInfo.resource2) {
          return `❌ Token ${fromResourceAddress.slice(0, 16)}... is not in this pool`;
        }
        if (toResourceAddress !== poolInfo.resource1 && toResourceAddress !== poolInfo.resource2) {
          return `❌ Token ${toResourceAddress.slice(0, 16)}... is not in this pool`;
        }

        // Check if user has sufficient balance of input token
        try {
          const accountBalances = await gatewayClient.getAccountBalances(ownerAddress);
          const fungibleResources = accountBalances?.items?.[0]?.fungible_resources?.items || [];
          
          let inputBalance = 0;
          
          for (const resource of fungibleResources) {
            if (resource.resource_address === fromResourceAddress) {
              const vaults = (resource as any).vaults?.items || [];
              if (vaults.length > 0) {
                inputBalance = parseFloat(vaults[0].amount || "0");
              }
              break;
            }
          }
          
          if (inputBalance < parsedAmountIn) {
            return `❌ Insufficient balance: need ${parsedAmountIn}, have ${inputBalance}`;
          }
        } catch (error) {
          console.warn("Could not check balances:", error);
        }

        // Get current epoch
        const currentEpoch = await gatewayClient.getCurrentEpoch();

        // Prepare swap options
        const swapOptions = {
          ownerAddress,
          poolAddress,
          fromResourceAddress,
          toResourceAddress,
          amountIn,
          minAmountOut,
        };

        console.log('🔄 Swapping tokens with options:', swapOptions);

        // Perform the swap using the DeFi service
        const txHash = await defiService.swapTokens(
          swapOptions,
          wallet,
          currentEpoch
        );

        // Get token symbols for display
        let fromSymbol = "tokens";
        let toSymbol = "tokens";

                 // Try to get token symbols from metadata
         try {
           const fromTokenDetails = await gatewayClient.getEntityDetails(fromResourceAddress);
           const fromMetadata = fromTokenDetails?.items?.[0]?.metadata?.items || [];
           const fromSymbolMetadata = fromMetadata.find((item: any) => item.key === 'symbol');
           if (fromSymbolMetadata?.value?.typed?.type === 'String') {
             fromSymbol = (fromSymbolMetadata.value.typed as any).value;
           }

           const toTokenDetails = await gatewayClient.getEntityDetails(toResourceAddress);
           const toMetadata = toTokenDetails?.items?.[0]?.metadata?.items || [];
           const toSymbolMetadata = toMetadata.find((item: any) => item.key === 'symbol');
           if (toSymbolMetadata?.value?.typed?.type === 'String') {
             toSymbol = (toSymbolMetadata.value.typed as any).value;
           }
         } catch (error) {
           console.warn("Could not get token symbols:", error);
         }

        // Format success message
        const poolDisplay = `${poolAddress.slice(0, 16)}...`;
        const fromDisplay = `${fromResourceAddress.slice(0, 16)}...`;
        const toDisplay = `${toResourceAddress.slice(0, 16)}...`;

        let successMessage = `✅ Successfully swapped tokens on Ociswap!\n`;
        successMessage += `🏊‍♂️ Pool: ${poolDisplay}\n`;
        successMessage += `🔄 Swap: ${parsedAmountIn} ${fromSymbol} → ${toSymbol}\n`;
        successMessage += `📊 From: ${fromDisplay}\n`;
        successMessage += `📊 To: ${toDisplay}\n`;
        if (parsedMinAmountOut > 0) {
          successMessage += `🛡️ Min Expected: ${parsedMinAmountOut} ${toSymbol}\n`;
        }
        successMessage += `🔗 Transaction: ${txHash}\n`;
        successMessage += `🌐 Dashboard: https://stokenet-dashboard.radixdlt.com/transaction/${txHash}`;

        return successMessage;
      } catch (error) {
        console.error("Error swapping tokens:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Provide helpful error messages based on common issues
        if (errorMessage.includes("Pool not found")) {
          return `❌ Pool not found. Please check the pool address is correct and the pool exists.`;
        }
        if (errorMessage.includes("insufficient")) {
          return `❌ Insufficient funds for swap. Please check your token balance.`;
        }
        if (errorMessage.includes("slippage")) {
          return `❌ Slippage protection triggered. The output amount would be less than your minimum expected amount.`;
        }
        if (errorMessage.includes("liquidity")) {
          return `❌ Insufficient liquidity in the pool for this swap amount.`;
        }
        
        return `❌ Failed to swap tokens: ${errorMessage}`;
      }
    },
  });
}
