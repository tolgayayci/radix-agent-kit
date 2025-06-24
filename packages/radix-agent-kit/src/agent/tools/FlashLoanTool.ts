import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";
import { RadixGatewayClient } from "../../radix/RadixGatewayClient";
import { RadixTransactionBuilder } from "../../radix/RadixTransactionBuilder";
import { RadixWallet } from "../../radix/RadixWallet";
import { DeFi } from "../../radix/DeFi";

/**
 * Create a flash loan tool for Ociswap Pool V2
 * Flash loans allow borrowing assets without collateral, as long as they're repaid in the same transaction
 */
export function createFlashLoanTool(
  gatewayClient: RadixGatewayClient,
  transactionBuilder: RadixTransactionBuilder,
  wallet: RadixWallet,
  networkId: number
) {
  const defiService = new DeFi(transactionBuilder, gatewayClient, networkId);

  return new DynamicStructuredTool({
    name: "flash_loan",
    description: `Execute a flash loan operation on Ociswap Pool V2. Flash loans allow borrowing assets without collateral, as long as they're repaid within the same transaction. Perfect for arbitrage, collateral swaps, or liquidation protection.

Key features:
- Borrow any amount of tokens instantly
- No collateral required
- Must repay + fees in same transaction
- Enables advanced DeFi strategies like arbitrage

Example use cases:
- "Execute a flash loan to borrow 1000 XRD from pool address pool_xyz for arbitrage"
- "Flash loan 500 USDC from pool pool_abc using callback component comp_123"
- "Borrow tokens via flash loan for liquidation protection"`,

    schema: z.object({
      poolAddress: z.string().describe("Pool component address to borrow from (must support flash loans)"),
      resourceAddress: z.string().describe("Resource address of the token to borrow"),
      amount: z.union([z.number(), z.string()]).describe("Amount to borrow (can be number or string)"),
      callbackComponentAddress: z.string().describe("Component address that implements flash loan callback logic"),
      callbackData: z.string().optional().describe("Optional data to pass to the callback component"),
    }),

    func: async (input) => {
      try {
        const { poolAddress, resourceAddress, amount, callbackComponentAddress, callbackData } = input;

        // Validate required parameters
        if (!poolAddress || !resourceAddress || !amount || !callbackComponentAddress) {
          return "❌ Missing required parameters. Please provide poolAddress, resourceAddress, amount, and callbackComponentAddress.";
        }

        // Validate pool address format
        if (!poolAddress.startsWith('component_')) {
          return "❌ Invalid pool address format. Pool address should start with 'component_'.";
        }

        // Validate resource address format
        if (!resourceAddress.startsWith('resource_')) {
          return "❌ Invalid resource address format. Resource address should start with 'resource_'.";
        }

        // Validate callback component address format
        if (!callbackComponentAddress.startsWith('component_')) {
          return "❌ Invalid callback component address format. Component address should start with 'component_'.";
        }

        // Validate amount
        const parsedAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          return "❌ Invalid amount. Amount must be a positive number.";
        }

        // Get current epoch
        const currentEpoch = await gatewayClient.getCurrentEpoch();
        
        // Check if pool supports flash loans
        let poolInfo;
        try {
          poolInfo = await defiService.getPoolInfo(poolAddress);
          if (!poolInfo.flashLoansEnabled) {
            return "❌ Flash loans are not enabled for this pool. Please try a different pool.";
          }
        } catch (error) {
          return `❌ Unable to verify pool information: ${error}. Please check the pool address.`;
        }

                 // Get account address
         const accountAddress = wallet.getAddress();

        // Execute flash loan
        const txHash = await defiService.executeFlashLoan(
          {
            ownerAddress: accountAddress,
            poolAddress,
            resourceAddress,
            amount: parsedAmount,
            callbackComponentAddress,
            callbackData: callbackData || ""
          },
          wallet,
          currentEpoch
        );

        // Get resource symbol for better user experience
        let resourceSymbol = "tokens";
        try {
          const resourceInfo = await gatewayClient.getEntityDetails(resourceAddress);
          if (resourceInfo?.items?.[0]?.metadata?.items) {
            const symbolMetadata = resourceInfo.items[0].metadata.items.find(
              (item: any) => item.key === "symbol"
            );
            if (symbolMetadata?.value?.typed?.type === "String") {
              resourceSymbol = (symbolMetadata.value.typed as any).value;
            }
          }
        } catch (error) {
          console.warn('Failed to get resource symbol:', error);
        }

        return `✅ Flash loan executed successfully!

💸 **Flash Loan Details:**
- **Amount Borrowed:** ${parsedAmount} ${resourceSymbol}
- **Pool:** ${poolAddress}
- **Callback Component:** ${callbackComponentAddress}
- **Transaction Hash:** ${txHash}

⚡ **What happened:**
1. Borrowed ${parsedAmount} ${resourceSymbol} from the pool instantly
2. Your callback component executed its logic
3. The loan was repaid with fees in the same transaction

🔍 **Next Steps:**
- Monitor transaction confirmation on the Radix Dashboard
- Check your wallet for any remaining tokens from the operation
- Review callback component execution logs if needed

💡 **Flash Loan Tips:**
- Flash loans are perfect for arbitrage opportunities
- Always ensure your callback logic can repay the loan + fees
- Consider gas costs when calculating profitability
- Flash loans fail if not repaid in the same transaction`;

      } catch (error) {
        console.error("Flash loan execution failed:", error);
        
        if (error instanceof Error) {
          if (error.message.includes("insufficient")) {
            return `❌ Flash loan failed: Insufficient funds or liquidity. 

Possible causes:
- Pool doesn't have enough liquidity for the requested amount
- Callback component couldn't repay the loan
- Transaction fees exceed available balance

💡 Try reducing the borrow amount or check pool liquidity.`;
          }
          
          if (error.message.includes("callback")) {
            return `❌ Flash loan failed: Callback component error.

The callback component failed to execute properly. Common issues:
- Component doesn't implement flash loan callback interface
- Logic error in callback execution
- Failed to generate repayment amount

💡 Verify your callback component implementation.`;
          }
          
          return `❌ Flash loan failed: ${error.message}

💡 Common solutions:
- Verify pool supports flash loans
- Check callback component address
- Ensure sufficient network fees
- Validate borrow amount against pool liquidity`;
        }
        
        return `❌ Flash loan failed due to an unexpected error. Please check your parameters and try again.`;
      }
    },
  });
} 