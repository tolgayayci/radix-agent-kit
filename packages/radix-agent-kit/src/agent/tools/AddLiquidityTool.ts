import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { RadixGatewayClient } from "../../radix/RadixGatewayClient";
import { RadixTransactionBuilder } from "../../radix/RadixTransactionBuilder";
import { RadixWallet } from "../../radix/RadixWallet";
import { DeFi } from "../../radix/DeFi";

/**
 * Tool for adding liquidity to Ociswap pools
 */
export function createAddLiquidityTool(
  gatewayClient: RadixGatewayClient,
  transactionBuilder: RadixTransactionBuilder,
  wallet: RadixWallet,
  networkId: number
) {
  const defiService = new DeFi(transactionBuilder, gatewayClient, networkId);

  return new DynamicStructuredTool({
    name: "add_liquidity",
    description: "Add liquidity to an existing Ociswap pool. Provide the pool address and amounts of both tokens you want to add.",
    schema: z.object({
      poolAddress: z.string().describe("Pool component address"),
      amount1: z.union([z.string(), z.number()]).describe("Amount of first token to add"),
      amount2: z.union([z.string(), z.number()]).describe("Amount of second token to add"),
      minAmount1: z.union([z.string(), z.number()]).optional().describe("Minimum amount of first token (slippage protection)"),
      minAmount2: z.union([z.string(), z.number()]).optional().describe("Minimum amount of second token (slippage protection)"),
    }),
    func: async (input) => {
      try {
        const { poolAddress, amount1, amount2, minAmount1, minAmount2 } = input;

        // Get the agent's wallet address
        const ownerAddress = wallet.getAddress();

        // Validate pool address format
        if (!poolAddress.startsWith("component_")) {
          return `❌ Invalid pool address format: ${poolAddress}`;
        }

        // Parse and validate amounts
        const parsedAmount1 = parseFloat(amount1.toString());
        const parsedAmount2 = parseFloat(amount2.toString());
        
        if (isNaN(parsedAmount1) || parsedAmount1 <= 0) {
          return `❌ Invalid amount for first token: ${amount1}`;
        }
        if (isNaN(parsedAmount2) || parsedAmount2 <= 0) {
          return `❌ Invalid amount for second token: ${amount2}`;
        }

        // Get pool information to determine what tokens are needed
        let poolInfo;
        try {
          poolInfo = await defiService.getPoolInfo(poolAddress);
        } catch (error) {
          return `❌ Could not get pool information: ${error instanceof Error ? error.message : String(error)}`;
        }

        // Check if user has sufficient balance
        try {
          const accountBalances = await gatewayClient.getAccountBalances(ownerAddress);
          const fungibleResources = accountBalances?.items?.[0]?.fungible_resources?.items || [];
          
          let balance1 = 0;
          let balance2 = 0;
          
          for (const resource of fungibleResources) {
            if (resource.resource_address === poolInfo.resource1) {
              const vaults = (resource as any).vaults?.items || [];
              if (vaults.length > 0) {
                balance1 = parseFloat(vaults[0].amount || "0");
              }
            }
            if (resource.resource_address === poolInfo.resource2) {
              const vaults = (resource as any).vaults?.items || [];
              if (vaults.length > 0) {
                balance2 = parseFloat(vaults[0].amount || "0");
              }
            }
          }
          
          if (balance1 < parsedAmount1) {
            return `❌ Insufficient balance for first token: need ${parsedAmount1}, have ${balance1}`;
          }
          if (balance2 < parsedAmount2) {
            return `❌ Insufficient balance for second token: need ${parsedAmount2}, have ${balance2}`;
          }
        } catch (error) {
          console.warn("Could not check balances:", error);
        }

        // Get current epoch
        const currentEpoch = await gatewayClient.getCurrentEpoch();

        // Prepare add liquidity options
        const addLiquidityOptions = {
          ownerAddress,
          poolAddress,
          amounts: [amount1, amount2] as [number | string, number | string],
          minAmounts: minAmount1 && minAmount2 ? [minAmount1, minAmount2] as [number | string, number | string] : undefined,
        };

        console.log('💰 Adding liquidity with options:', addLiquidityOptions);

        // Add liquidity using the DeFi service
        const txHash = await defiService.addLiquidity(
          addLiquidityOptions,
          wallet,
          currentEpoch
        );

        // Format success message
        const poolDisplay = `${poolAddress.slice(0, 16)}...`;
        const resource1Display = `${poolInfo.resource1.slice(0, 16)}...`;
        const resource2Display = `${poolInfo.resource2.slice(0, 16)}...`;

        let successMessage = `✅ Successfully added liquidity to Ociswap pool!\n`;
        successMessage += `🏊‍♂️ Pool: ${poolDisplay}\n`;
        successMessage += `📊 Tokens: ${resource1Display} + ${resource2Display}\n`;
        successMessage += `💰 Amounts: ${parsedAmount1} + ${parsedAmount2}\n`;
        successMessage += `🔗 Transaction: ${txHash}\n`;
        successMessage += `🌐 Dashboard: https://stokenet-dashboard.radixdlt.com/transaction/${txHash}`;

        return successMessage;
      } catch (error) {
        console.error("Error adding liquidity:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Provide helpful error messages based on common issues
        if (errorMessage.includes("Pool not found")) {
          return `❌ Pool not found. Please check the pool address is correct and the pool exists.`;
        }
        if (errorMessage.includes("insufficient")) {
          return `❌ Insufficient funds to add liquidity. Please check your token balances.`;
        }
        if (errorMessage.includes("slippage")) {
          return `❌ Slippage protection triggered. Try adjusting your minimum amounts or try again later.`;
        }
        
        return `❌ Failed to add liquidity: ${errorMessage}`;
      }
    },
  });
}
