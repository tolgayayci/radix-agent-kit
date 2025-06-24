import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { RadixGatewayClient } from "../../radix/RadixGatewayClient";
import { RadixTransactionBuilder } from "../../radix/RadixTransactionBuilder";
import { RadixWallet } from "../../radix/RadixWallet";
import { DeFi } from "../../radix/DeFi";

/**
 * Tool for creating a two-resource liquidity pool using Ociswap
 */
export function createCreateTwoResourcePoolTool(
  gatewayClient: RadixGatewayClient,
  transactionBuilder: RadixTransactionBuilder,
  wallet: RadixWallet,
  networkId: number
) {
  const defiService = new DeFi(transactionBuilder, gatewayClient, networkId);

  return new DynamicStructuredTool({
    name: "create_two_resource_pool",
    description: "Create a new two-resource liquidity pool on Ociswap with initial liquidity. You can specify either resource addresses or token symbols. If using symbols, the tool will find tokens in your wallet that match those symbols.",
    schema: z.object({
      resourceAddress1: z.string().optional().describe("First token resource address (alternative to symbol1)"),
      resourceAddress2: z.string().optional().describe("Second token resource address (alternative to symbol2)"),
      symbol1: z.string().optional().describe("First token symbol to find in wallet (alternative to resourceAddress1)"),
      symbol2: z.string().optional().describe("Second token symbol to find in wallet (alternative to resourceAddress2)"),
      amount1: z.union([z.string(), z.number()]).describe("Initial amount of first token to add as liquidity"),
      amount2: z.union([z.string(), z.number()]).describe("Initial amount of second token to add as liquidity"),
      feeTier: z.union([z.literal(1), z.literal(5), z.literal(30), z.literal(100)]).optional().describe("Fee tier: 1 (0.01%), 5 (0.05%), 30 (0.3%), or 100 (1%) - default: 30"),
      poolName: z.string().optional().describe("Optional name for the pool"),
      poolSymbol: z.string().optional().describe("Optional symbol for the pool"),
    }),
    func: async (input) => {
      try {
        let resourceAddress1: string;
        let resourceAddress2: string;

        // Get the agent's wallet address
        const ownerAddress = wallet.getAddress();

        // Determine resource addresses
        if (input.resourceAddress1 && input.resourceAddress2) {
          // Direct addresses provided
          resourceAddress1 = input.resourceAddress1;
          resourceAddress2 = input.resourceAddress2;
        } else if (input.symbol1 && input.symbol2) {
          // Find tokens by symbol in user's wallet
          console.log(`🔍 Looking for tokens with symbols: ${input.symbol1}, ${input.symbol2}`);
          
          try {
            const accountBalances = await gatewayClient.getAccountBalances(ownerAddress);
            const fungibleResources = accountBalances?.items?.[0]?.fungible_resources?.items || [];
            
            let foundToken1: string | undefined;
            let foundToken2: string | undefined;
            
            // Search through fungible resources for matching symbols
            for (const resource of fungibleResources) {
              if (!resource.resource_address) continue;
              
              try {
                // Get resource metadata to find symbol
                const entityDetails = await gatewayClient.getEntityDetails(resource.resource_address);
                const metadata = entityDetails?.items?.[0]?.metadata?.items || [];
                
                const symbolMetadata = metadata.find((item: any) => item.key === 'symbol');
                const symbol = symbolMetadata?.value?.typed?.type === 'String' ? symbolMetadata.value.typed.value : undefined;
                
                if (symbol === input.symbol1) {
                  foundToken1 = resource.resource_address;
                  console.log(`✅ Found ${input.symbol1}: ${foundToken1}`);
                }
                if (symbol === input.symbol2) {
                  foundToken2 = resource.resource_address;
                  console.log(`✅ Found ${input.symbol2}: ${foundToken2}`);
                }
                
                if (foundToken1 && foundToken2) break;
              } catch (metadataError) {
                console.warn(`Could not get metadata for ${resource.resource_address}:`, metadataError);
              }
            }
            
            if (!foundToken1) {
              return `❌ Could not find token with symbol "${input.symbol1}" in your wallet. Please check you own this token or provide the resource address directly.`;
            }
            if (!foundToken2) {
              return `❌ Could not find token with symbol "${input.symbol2}" in your wallet. Please check you own this token or provide the resource address directly.`;
            }
            
            resourceAddress1 = foundToken1;
            resourceAddress2 = foundToken2;
            
          } catch (error) {
            return `❌ Error looking up tokens in wallet: ${error instanceof Error ? error.message : String(error)}`;
          }
        } else {
          return "❌ Please provide either resource addresses (resourceAddress1, resourceAddress2) or token symbols (symbol1, symbol2)";
        }

        // Validate that the addresses are different
        if (resourceAddress1 === resourceAddress2) {
          return "❌ Cannot create pool with the same resource twice";
        }

        // Validate resource addresses format
        if (!resourceAddress1.startsWith("resource_")) {
          return `❌ Invalid first resource address format: ${resourceAddress1}`;
        }
        if (!resourceAddress2.startsWith("resource_")) {
          return `❌ Invalid second resource address format: ${resourceAddress2}`;
        }

        // Validate amounts
        const amount1 = parseFloat(input.amount1.toString());
        const amount2 = parseFloat(input.amount2.toString());
        
        if (isNaN(amount1) || amount1 <= 0) {
          return `❌ Invalid amount for first token: ${input.amount1}`;
        }
        if (isNaN(amount2) || amount2 <= 0) {
          return `❌ Invalid amount for second token: ${input.amount2}`;
        }

        // Check if user has sufficient balance
        try {
          const accountBalances = await gatewayClient.getAccountBalances(ownerAddress);
          const fungibleResources = accountBalances?.items?.[0]?.fungible_resources?.items || [];
          
          let balance1 = 0;
          let balance2 = 0;
          
          for (const resource of fungibleResources) {
            if (resource.resource_address === resourceAddress1) {
              const vaults = (resource as any).vaults?.items || [];
              if (vaults.length > 0) {
                balance1 = parseFloat(vaults[0].amount || "0");
              }
            }
            if (resource.resource_address === resourceAddress2) {
              const vaults = (resource as any).vaults?.items || [];
              if (vaults.length > 0) {
                balance2 = parseFloat(vaults[0].amount || "0");
              }
            }
          }
          
          if (balance1 < amount1) {
            return `❌ Insufficient balance for first token: need ${amount1}, have ${balance1}`;
          }
          if (balance2 < amount2) {
            return `❌ Insufficient balance for second token: need ${amount2}, have ${balance2}`;
          }
        } catch (error) {
          console.warn("Could not check balances:", error);
        }

        // Get current epoch
        const currentEpoch = await gatewayClient.getCurrentEpoch();

        // Create pool options with initial liquidity
        const feeTier = input.feeTier || 30;
        
        // Validate fee tier against supported values
        const validFeeTiers: (1 | 5 | 30 | 100)[] = [1, 5, 30, 100];
        if (!validFeeTiers.includes(feeTier as any)) {
          return `❌ Invalid fee tier: ${feeTier}. Supported tiers: 1 (0.01%), 5 (0.05%), 30 (0.3%), 100 (1%)`;
        }
        
        const poolOptions = {
          ownerAddress,
          resourceAddress1,
          resourceAddress2,
          amount1: input.amount1,
          amount2: input.amount2,
          feeTier: feeTier as 1 | 5 | 30 | 100,
          poolName: input.poolName,
          poolSymbol: input.poolSymbol,
        };

        console.log('🏊‍♂️ Creating Ociswap pool with options:', poolOptions);

        // Create the two-resource pool
        const result = await defiService.createTwoResourcePool(
          poolOptions,
          wallet,
          currentEpoch
        );

        // Format success message
        const resource1Display = `${resourceAddress1.slice(0, 16)}...`;
        const resource2Display = `${resourceAddress2.slice(0, 16)}...`;
        const poolNameDisplay = input.poolName || "Ociswap";

        let successMessage = `✅ Successfully created ${poolNameDisplay} pool on Ociswap!\n`;
        successMessage += `📊 Pool Resources: ${resource1Display} + ${resource2Display}\n`;
        successMessage += `💰 Initial Liquidity: ${amount1} + ${amount2}\n`;
        successMessage += `💵 Fee Tier: ${poolOptions.feeTier / 100}%\n`;
        successMessage += `🔗 Transaction: ${result.txHash}\n`;
        
        if (result.poolAddress) {
          const poolDisplay = `${result.poolAddress.slice(0, 16)}...`;
          successMessage += `🏊‍♂️ Pool Address: ${poolDisplay}\n`;
          successMessage += `🌐 Dashboard: https://stokenet-dashboard.radixdlt.com/component/${result.poolAddress}`;
        } else {
          successMessage += `ℹ️  Pool address will be available once transaction is confirmed`;
        }

        return successMessage;
      } catch (error) {
        console.error("Error creating two-resource pool:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Provide helpful error messages based on common issues
        if (errorMessage.includes("Ociswap not supported")) {
          return `❌ Pool creation is only supported on Stokenet and Mainnet. Please ensure you're connected to the correct network.`;
        }
        if (errorMessage.includes("insufficient")) {
          return `❌ Insufficient funds to create pool. Please check your token balances.`;
        }
        if (errorMessage.includes("duplicate")) {
          return `❌ Transaction was already submitted. Please check your transaction history.`;
        }
        
        return `❌ Failed to create pool: ${errorMessage}`;
      }
    },
  });
} 