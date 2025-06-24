import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { RadixGatewayClient } from "../../radix/RadixGatewayClient";
import { RadixTransactionBuilder } from "../../radix/RadixTransactionBuilder";
import { RadixWallet } from "../../radix/RadixWallet";
import { DeFi } from "../../radix/DeFi";

/**
 * Tool for removing liquidity from Ociswap pools
 */
export function createRemoveLiquidityTool(
  gatewayClient: RadixGatewayClient,
  transactionBuilder: RadixTransactionBuilder,
  wallet: RadixWallet,
  networkId: number
) {
  const defiService = new DeFi(transactionBuilder, gatewayClient, networkId);

  return new DynamicStructuredTool({
    name: "remove_liquidity",
    description: 
      "Remove liquidity from an Ociswap pool by redeeming LP tokens. This burns your LP tokens and returns the proportional amounts of the underlying assets.",
    schema: z.object({
      poolAddress: z.string().describe("Pool component address to remove liquidity from"),
      amountLP: z.union([z.string(), z.number()]).describe("Amount of LP tokens to redeem for underlying assets"),
      minAmount1: z.union([z.string(), z.number()]).optional().describe("Minimum amount of first token to receive (slippage protection)"),
      minAmount2: z.union([z.string(), z.number()]).optional().describe("Minimum amount of second token to receive (slippage protection)"),
    }),
    func: async (input) => {
      try {
        const { poolAddress, amountLP, minAmount1, minAmount2 } = input;

        // Get the agent's wallet address
        const ownerAddress = wallet.getAddress();

        // Validate pool address format
        if (!poolAddress.startsWith('component_')) {
          return `❌ Invalid pool address format: ${poolAddress}. Expected component address starting with 'component_'`;
        }

        // Parse and validate amount
        const parsedAmountLP = parseFloat(amountLP.toString());
        if (isNaN(parsedAmountLP) || parsedAmountLP <= 0) {
          return `❌ Invalid LP token amount: ${amountLP}. Must be a positive number`;
        }

        // Get pool information to determine what tokens will be returned
        let poolInfo;
        try {
          poolInfo = await defiService.getPoolInfo(poolAddress);
        } catch (error) {
          return `❌ Could not get pool information: ${error instanceof Error ? error.message : String(error)}`;
        }

        // Check if user has sufficient LP tokens
        let lpTokenAddress: string | undefined;
        let lpBalance = 0;
        
        try {
          const accountBalances = await gatewayClient.getAccountBalances(ownerAddress);
          
          // Check for NFT-based LP tokens (Ociswap v2 style)
          if (accountBalances?.items?.[0]?.non_fungible_resources?.items) {
            for (const resource of accountBalances.items[0].non_fungible_resources.items) {
              if (resource.vaults?.items?.[0]?.total_count && 
                  parseInt(resource.vaults.items[0].total_count) > 0) {
                // This could be an LP NFT - in practice you'd verify it's from the correct pool
                lpTokenAddress = resource.resource_address;
                lpBalance = parseInt(resource.vaults.items[0].total_count);
                break;
              }
            }
          }
          
          // Also check for fungible LP tokens (fallback)
          if (!lpTokenAddress && accountBalances?.items?.[0]?.fungible_resources?.items) {
            for (const resource of accountBalances.items[0].fungible_resources.items) {
              // Skip XRD and the pool's main tokens
              if (resource.resource_address !== transactionBuilder.getXRDResourceAddress() &&
                  resource.resource_address !== poolInfo.resource1 &&
                  resource.resource_address !== poolInfo.resource2) {
                
                const vaults = (resource as any).vaults?.items || [];
                if (vaults.length > 0) {
                  const balance = parseFloat(vaults[0].amount || "0");
                  if (balance > 0) {
                    lpTokenAddress = resource.resource_address;
                    lpBalance = balance;
                    break;
                  }
                }
              }
            }
          }
          
          if (!lpTokenAddress) {
            return `❌ No LP tokens found for this pool. You may not have liquidity in this pool.`;
          }
          
          if (lpBalance < parsedAmountLP) {
            return `❌ Insufficient LP tokens: need ${parsedAmountLP}, have ${lpBalance}`;
          }
        } catch (error) {
          console.warn("Could not check LP token balance:", error);
        }

        // Get current epoch
        const currentEpoch = await gatewayClient.getCurrentEpoch();

        // Prepare remove liquidity options
        const removeLiquidityOptions = {
          ownerAddress,
          poolAddress,
          amountLP: parsedAmountLP,
          minAmounts: minAmount1 && minAmount2 ? [minAmount1, minAmount2] as [number | string, number | string] : undefined,
        };

        console.log('💸 Removing liquidity with options:', removeLiquidityOptions);

        // Remove liquidity using the DeFi service
        const txHash = await defiService.removeLiquidity(
          removeLiquidityOptions,
          wallet,
          currentEpoch
        );

        // Format success message
        const poolDisplay = `${poolAddress.slice(0, 16)}...`;
        const resource1Display = `${poolInfo.resource1.slice(0, 16)}...`;
        const resource2Display = `${poolInfo.resource2.slice(0, 16)}...`;
        const formattedAmount = parsedAmountLP.toLocaleString();

        let successMessage = `✅ Successfully removed liquidity from Ociswap pool!\n`;
        successMessage += `🏊‍♂️ Pool: ${poolDisplay}\n`;
        successMessage += `📊 Tokens: ${resource1Display} + ${resource2Display}\n`;
        successMessage += `💸 LP Tokens Redeemed: ${formattedAmount}\n`;
        if (minAmount1 && minAmount2) {
          successMessage += `🛡️ Slippage Protection: ${minAmount1} + ${minAmount2}\n`;
        }
        successMessage += `🔗 Transaction: ${txHash}\n`;
        successMessage += `🌐 Dashboard: https://stokenet-dashboard.radixdlt.com/transaction/${txHash}\n\n`;
        successMessage += `💡 Your LP tokens were burned and proportional amounts of both underlying assets have been returned to your account.`;

        return successMessage;
      } catch (error) {
        console.error("Error removing liquidity:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Provide helpful error messages based on common issues
        if (errorMessage.includes("Pool not found")) {
          return `❌ Pool not found. Please check the pool address is correct and the pool exists.`;
        }
        if (errorMessage.includes("Could not determine LP token")) {
          return `❌ Could not find your LP tokens for this pool. You may not have any liquidity in this pool.`;
        }
        if (errorMessage.includes("insufficient")) {
          return `❌ Insufficient LP tokens to remove the requested amount of liquidity.`;
        }
        if (errorMessage.includes("slippage")) {
          return `❌ Slippage protection triggered. The returned amounts would be less than your minimum expected amounts.`;
        }
        
        return `❌ Failed to remove liquidity: ${errorMessage}`;
      }
    },
  });
} 