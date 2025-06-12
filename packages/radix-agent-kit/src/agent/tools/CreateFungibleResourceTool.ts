import { RadixGatewayClient } from "../../radix/RadixGatewayClient";
import { RadixTransactionBuilder } from "../../radix/RadixTransactionBuilder";
import { RadixWallet } from "../../radix/RadixWallet";
import { Token } from "../../radix/Token";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * Extract resource address from transaction receipt using proper async polling
 */
async function extractResourceAddress(gatewayClient: RadixGatewayClient, txHash: string): Promise<string | null> {
  try {
    console.log(`🔍 Extracting resource address from transaction: ${txHash}`);
    
    const maxAttempts = 20; // Maximum number of attempts
    const pollInterval = 3000; // 3 seconds between polls
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      attempts++;
      console.log(`   Resource extraction attempt ${attempts}/${maxAttempts}...`);
      
      try {
        // Use proper transaction status API
        const statusResponse = await gatewayClient.getTransactionStatus(txHash);
        
        // Check if transaction is committed
        if (statusResponse.status === 'CommittedSuccess' || statusResponse.status === 'CommittedFailure') {
          console.log(`   Transaction status: ${statusResponse.status}`);
          
          if (statusResponse.status === 'CommittedSuccess') {
            // Get full transaction details for the committed transaction
            const detailsResponse = await gatewayClient.getTransactionDetails(txHash);
            
            // Look for resource in new_global_entities
            const newEntities = detailsResponse.transaction?.receipt?.state_updates?.new_global_entities;
            if (newEntities && newEntities.length > 0) {
              for (const entity of newEntities) {
                if (entity.entity_type === 'GlobalFungibleResource') {
                  console.log(`✅ Resource address extracted: ${entity.entity_address}`);
                  return entity.entity_address;
                }
              }
            }
            
            console.log('   No fungible resource found in committed transaction');
            return null;
          } else {
            // Transaction failed
            console.log(`   Transaction failed: ${statusResponse.error_message || 'Unknown error'}`);
            return null;
          }
        } else {
          // Transaction still pending or unknown status
          console.log(`   Transaction status: ${statusResponse.status || statusResponse.intent_status || 'Pending'}`);
          
          // Wait before next poll
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
      } catch (error) {
        console.log(`   Error on attempt ${attempts}:`, error instanceof Error ? error.message : 'Unknown error');
        
        // Wait before retrying on error
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }
    
    console.log(`⏰ Resource extraction failed after ${maxAttempts} attempts`);
    return null;
  } catch (error) {
    console.error('Error extracting resource address:', error);
    return null;
  }
}

/**
 * Factory function to create a fungible resource creation tool
 */
export function createCreateFungibleResourceTool(
  gatewayClient: RadixGatewayClient,
  transactionBuilder: RadixTransactionBuilder,
  wallet: RadixWallet,
  networkId: number
): DynamicStructuredTool {
  const tokenService = new Token(transactionBuilder, gatewayClient, networkId);

  return new DynamicStructuredTool({
    name: "create_fungible_resource",
    description: "Create a new fungible token resource. Input format: 'name,symbol,initialSupply[,divisibility]' or JSON: {'name': 'MyToken', 'symbol': 'MTK', 'initialSupply': '1000000', 'divisibility': 18}",
    schema: z.object({
      input: z.string().describe("Token creation parameters"),
    }),
    func: async ({ input }) => {
      try {
        // Validate input before parsing
        if (!input || input.trim().length === 0) {
          return "❌ Invalid input. Please provide token name, symbol, and initial supply.\nFormat: 'name,symbol,initialSupply[,divisibility]' or JSON: {'name': 'MyToken', 'symbol': 'MTK', 'initialSupply': '1000000', 'divisibility': 18}";
        }

        let name: string;
        let symbol: string;
        let initialSupply: string;
        let divisibility: number = 18; // Default divisibility

        // Parse input
        const parsed = parseInput(input);

        if (parsed.parts && parsed.parts.length > 0) {
          // Handle comma-separated format
          const parts = parsed.parts;
          if (parts.length < 3) {
            return "❌ Invalid input format. Expected: 'name,symbol,initialSupply[,divisibility]'";
          }

          name = parts[0];
          symbol = parts[1];
          initialSupply = parts[2];
          if (parts[3]) {
            divisibility = parseInt(parts[3]);
            if (isNaN(divisibility) || divisibility < 0 || divisibility > 18) {
              return "❌ Invalid divisibility. Must be between 0 and 18.";
            }
          }
        } else {
          // Handle JSON format
          if (!parsed.name || !parsed.symbol || !parsed.initialSupply) {
            return "❌ Missing required parameters: name, symbol, and initialSupply";
          }

          name = parsed.name;
          symbol = parsed.symbol;
          initialSupply = parsed.initialSupply;
          if (parsed.divisibility) {
            divisibility = parseInt(parsed.divisibility);
            if (isNaN(divisibility) || divisibility < 0 || divisibility > 18) {
              return "❌ Invalid divisibility. Must be between 0 and 18.";
            }
          }
        }

        // Validate inputs
        if (!name || name.length === 0) {
          return "❌ Token name cannot be empty";
        }

        if (!symbol || symbol.length === 0) {
          return "❌ Token symbol cannot be empty";
        }

        // Parse and validate initial supply
        const parsedSupply = parseAmount(initialSupply);

        // Check if agent has enough XRD for token creation
        const canCreate = await tokenService.canCreateTokens(wallet.getAddress());
        if (!canCreate) {
          return "❌ Insufficient XRD balance for token creation. Need at least 5 XRD.";
        }

        // Get current epoch
        const currentEpoch = await gatewayClient.getCurrentEpoch();

        // Create the fungible resource
        const txHash = await tokenService.createFungibleResource(
          {
            name: name,
            symbol: symbol,
            initialSupply: parsedSupply,
            divisibility: divisibility,
            description: `${name} token created by Radix Agent Kit`,
          },
          wallet,
          currentEpoch
        );

        // Extract the resource address from the transaction receipt
        const resourceAddress = await extractResourceAddress(gatewayClient, txHash);
        
        if (resourceAddress) {
          return `✅ ${name} (${symbol}) token created successfully with ${formatBalance(parsedSupply, symbol)} initial supply.\n🔗 Resource: ${resourceAddress}\n📝 Transaction: ${txHash}`;
        } else {
          return `✅ ${name} (${symbol}) token transaction submitted: ${txHash}\n⏳ Resource address will be available once the transaction is confirmed.`;
        }

      } catch (error) {
        console.error("Error creating fungible resource:", error);
        return `❌ Failed to create fungible resource: ${formatError(error)}`;
      }
    },
  });
}

/**
 * Parse input string that can be comma-separated or JSON
 */
function parseInput(input: string): any {
  // Try to parse as JSON first
  try {
    return JSON.parse(input);
  } catch {
    // If not JSON, try comma-separated format
    const trimmed = input.trim();
    if (trimmed.includes(',')) {
      const parts = trimmed.split(',').map(part => part.trim());
      return { parts };
    }
    return {};
  }
}

/**
 * Parse amount string to ensure it's a valid number
 */
function parseAmount(amount: string | number): string {
  const parsed = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(parsed) || parsed <= 0) {
    throw new Error(`Invalid amount: ${amount}. Must be a positive number.`);
  }
  return parsed.toString();
}

/**
 * Format transaction result for user display
 */
function formatTransactionResult(txHash: string, operation: string): string {
  return `✅ ${operation} completed successfully. Transaction: ${txHash.slice(
    0,
    16
  )}...`;
}

/**
 * Format balance information for display
 */
function formatBalance(amount: string, symbol: string = "XRD"): string {
  const formatted = parseFloat(amount).toLocaleString();
  return `${formatted} ${symbol}`;
}

/**
 * Format error for display
 */
function formatError(error: any): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

// Keep the class for backward compatibility
export class CreateFungibleResourceTool {
  name = "create_fungible_resource";
  description = "Create a new fungible token resource. Input format: 'name,symbol,initialSupply[,divisibility]' or JSON: {'name': 'MyToken', 'symbol': 'MTK', 'initialSupply': '1000000', 'divisibility': 18}";

  constructor(
    private gatewayClient: RadixGatewayClient,
    private transactionBuilder: RadixTransactionBuilder,
    private wallet: RadixWallet,
    private networkId: number
  ) {}

  async _call(input: string): Promise<string> {
    const tool = createCreateFungibleResourceTool(
      this.gatewayClient,
      this.transactionBuilder,
      this.wallet,
      this.networkId
    );
    return tool.func({ input });
  }
}
