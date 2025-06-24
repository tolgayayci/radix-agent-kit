import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";
import { RadixGatewayClient } from "../../radix/RadixGatewayClient";
import { RadixTransactionBuilder } from "../../radix/RadixTransactionBuilder";
import { RadixWallet } from "../../radix/RadixWallet";
import { DeFi } from "../../radix/DeFi";

/**
 * Create a hooked pool tool for Ociswap Pool V2 with custom hook logic
 * Hooks allow custom code execution before/after swaps and liquidity operations
 */
export function createHookedPoolTool(
  gatewayClient: RadixGatewayClient,
  transactionBuilder: RadixTransactionBuilder,
  wallet: RadixWallet,
  networkId: number
) {
  const defiService = new DeFi(transactionBuilder, gatewayClient, networkId);

  return new DynamicStructuredTool({
    name: "create_hooked_pool",
    description: `Create a sophisticated Ociswap Pool V2 with custom hooks for advanced DeFi functionality. Hooks enable custom logic execution before/after swaps and liquidity operations.

Hook capabilities:
- Execute custom code before/after swaps
- Custom logic for liquidity operations
- Advanced fee structures
- Dynamic trading parameters
- MEV protection mechanisms

Perfect for:
- Creating pools with custom trading logic
- Implementing MEV protection
- Building advanced DeFi strategies
- Creating dynamic fee structures

Example use cases:
- "Create a hooked pool with DEFIA and DEFIB tokens using hook component hook_123"
- "Make a pool with custom trading logic for XRD and USDC with 0.05% fees"
- "Create a MEV-protected pool with hook address hook_abc"`,

    schema: z.object({
      token1Address: z.string().describe("First token resource address"),
      token2Address: z.string().describe("Second token resource address"),
      amount1: z.union([z.number(), z.string()]).describe("Initial amount of first token"),
      amount2: z.union([z.number(), z.string()]).describe("Initial amount of second token"),
      hookAddress: z.string().describe("Hook component address that implements custom pool logic"),
      feeTier: z.enum(["0.01", "0.05", "0.3", "1.0"]).optional().describe("Fee tier: 0.01%, 0.05%, 0.3%, or 1.0% (default: 0.3%)"),
      poolName: z.string().optional().describe("Optional name for the pool"),
    }),

    func: async (input) => {
      try {
        const { 
          token1Address, 
          token2Address, 
          amount1, 
          amount2,
          hookAddress,
          feeTier = "0.3",
          poolName
        } = input;

        // Validate required parameters
        if (!token1Address || !token2Address || !amount1 || !amount2 || !hookAddress) {
          return "❌ Missing required parameters. Please provide both token addresses, amounts, and hook address.";
        }

        // Validate token addresses
        if (!token1Address.startsWith('resource_') || !token2Address.startsWith('resource_')) {
          return "❌ Invalid token address format. Token addresses should start with 'resource_'.";
        }

        // Validate hook address
        if (!hookAddress.startsWith('component_')) {
          return "❌ Invalid hook address format. Hook address should start with 'component_'.";
        }

        // Validate amounts
        const parsedAmount1 = typeof amount1 === 'string' ? parseFloat(amount1) : amount1;
        const parsedAmount2 = typeof amount2 === 'string' ? parseFloat(amount2) : amount2;

        if (isNaN(parsedAmount1) || parsedAmount1 <= 0 || isNaN(parsedAmount2) || parsedAmount2 <= 0) {
          return "❌ Invalid amounts. Both amounts must be positive numbers.";
        }

        // Convert fee tier to basis points
        const feeMap: Record<string, 1 | 5 | 30 | 100> = {
          "0.01": 1,
          "0.05": 5,
          "0.3": 30,
          "1.0": 100
        };
        const feeBasisPoints = feeMap[feeTier];

        // Get current epoch
        const currentEpoch = await gatewayClient.getCurrentEpoch();
        
        // Get account address
        const accountAddress = wallet.getAddress();

        // Check token balances
        try {
          const balances = await gatewayClient.getAccountBalances(accountAddress);
          
          let hasToken1 = false;
          let hasToken2 = false;
          let token1Balance = 0;
          let token2Balance = 0;
          let token1Symbol = "Token1";
          let token2Symbol = "Token2";

          for (const balance of balances) {
            if (balance.resource_address === token1Address) {
              hasToken1 = true;
              token1Balance = parseFloat(balance.amount || "0");
              token1Symbol = balance.resource_symbol || token1Symbol;
            }
            if (balance.resource_address === token2Address) {
              hasToken2 = true;
              token2Balance = parseFloat(balance.amount || "0");
              token2Symbol = balance.resource_symbol || token2Symbol;
            }
          }

          if (!hasToken1 || token1Balance < parsedAmount1) {
            return `❌ Insufficient ${token1Symbol} balance. Required: ${parsedAmount1}, Available: ${token1Balance}`;
          }

          if (!hasToken2 || token2Balance < parsedAmount2) {
            return `❌ Insufficient ${token2Symbol} balance. Required: ${parsedAmount2}, Available: ${token2Balance}`;
          }

          // Verify hook component exists
          try {
            const hookInfo = await gatewayClient.getEntityDetails(hookAddress);
            if (!hookInfo?.items?.[0]) {
              return "❌ Hook component not found. Please verify the hook address.";
            }
          } catch (error) {
            return `❌ Unable to verify hook component: ${error}`;
          }

          // Create hooked pool
          const result = await defiService.createTwoResourcePool(
            {
              ownerAddress: accountAddress,
              resourceAddress1: token1Address,
              resourceAddress2: token2Address,
              amount1: parsedAmount1,
              amount2: parsedAmount2,
              feeTier: feeBasisPoints,
              hookAddress: hookAddress,
              poolName: poolName
            },
            wallet,
            currentEpoch
          );

          return `🎣 Hooked pool created successfully!

🏊‍♂️ **Pool Details:**
- **Pool Type:** Hooked Pool V2 with Custom Logic
- **Tokens:** ${token1Symbol} + ${token2Symbol}
- **Initial Liquidity:** ${parsedAmount1} ${token1Symbol} + ${parsedAmount2} ${token2Symbol}
- **Fee Tier:** ${feeTier}%
- **Hook Component:** ${hookAddress}
- **Transaction Hash:** ${result.txHash}
${result.poolAddress ? `- **Pool Address:** ${result.poolAddress}` : ""}

⚡ **Hook Features Enabled:**
- Custom logic for swaps and liquidity operations
- Advanced trading parameters
- MEV protection capabilities
- Dynamic fee structures

🔍 **Next Steps:**
- Monitor transaction confirmation on Radix Dashboard
- Your pool will be available for trading once confirmed
- Hook logic will execute on all pool operations
- Other users can add liquidity to your hooked pool

💡 **Hooked Pool Benefits:**
- Customizable trading logic
- Enhanced security features
- Advanced DeFi strategies
- Protection against MEV attacks
- Dynamic parameter adjustment

🛠️ **Hook Integration:**
Your hook component will be called:
- Before each swap operation
- After each swap completion
- Before liquidity additions/removals
- After liquidity operations complete`;

        } catch (error) {
          if (error instanceof Error && error.message.includes("balance")) {
            return `❌ Balance check failed: ${error.message}. Please ensure you have sufficient tokens and try again.`;
          }
          throw error;
        }

      } catch (error) {
        console.error("Hooked pool creation failed:", error);
        
        if (error instanceof Error) {
          if (error.message.includes("hook")) {
            return `❌ Hook validation failed: ${error.message}

Common hook issues:
- Hook component doesn't implement required interface
- Hook address is incorrect or inaccessible
- Hook logic contains errors

💡 Verify your hook component implementation and address.`;
          }
          
          if (error.message.includes("fee tier")) {
            return `❌ Invalid fee tier: ${error.message}

Supported fee tiers:
- 0.01% (1 basis point)
- 0.05% (5 basis points)  
- 0.3% (30 basis points)
- 1.0% (100 basis points)`;
          }

          return `❌ Hooked pool creation failed: ${error.message}

💡 Common solutions:
- Verify hook component exists and is accessible
- Check token addresses and balances
- Ensure sufficient network fees
- Validate hook implementation`;
        }
        
        return `❌ Hooked pool creation failed due to an unexpected error. Please check your parameters and try again.`;
      }
    },
  });
} 