import { RadixGatewayClient } from "../../radix/RadixGatewayClient";
import { RadixTransactionBuilder } from "../../radix/RadixTransactionBuilder";
import { RadixWallet } from "../../radix/RadixWallet";
import { Token } from "../../radix/Token";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * Extract NFT resource address from transaction receipt
 */
async function extractNFTResourceAddress(gatewayClient: RadixGatewayClient, txHash: string): Promise<string | null> {
  try {
    // Wait for transaction to be processed
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    const receipt = await gatewayClient.getTransactionDetails(txHash);
    
    // Look for NFT resource in new_global_entities
    const newEntities = receipt.details?.receipt?.state_updates?.new_global_entities;
    if (newEntities && newEntities.length > 0) {
      for (const entity of newEntities) {
        if (entity.entity_type === 'GlobalNonFungibleResource') {
          return entity.entity_address;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting NFT resource address:', error);
    return null;
  }
}

/**
 * Factory function to create a non-fungible resource creation tool
 */
export function createCreateNonFungibleResourceTool(
  gatewayClient: RadixGatewayClient,
  transactionBuilder: RadixTransactionBuilder,
  wallet: RadixWallet,
  networkId: number
): DynamicStructuredTool {
  const tokenService = new Token(transactionBuilder, gatewayClient, networkId);

  return new DynamicStructuredTool({
    name: "create_non_fungible_resource",
    description: "Create a new NFT collection. Input format: 'name,description' or JSON: {'name': 'MyNFTs', 'description': 'My NFT Collection', 'maxSupply': 10000, 'iconUrl': 'https://...'}",
    schema: z.object({
      input: z.string().describe("NFT collection parameters"),
    }),
    func: async ({ input }) => {
      try {
        if (!input || input.trim().length === 0) {
          return "❌ Invalid input. Please provide collection name and description.\nFormat: 'name,description' or JSON: {'name': 'MyNFTs', 'description': 'My NFT Collection'}";
        }

        let name: string;
        let description: string;
        let maxSupply: number | undefined;
        let iconUrl: string | undefined;

        const parsed = parseInput(input);

        if (parsed.parts && parsed.parts.length > 0) {
          const parts = parsed.parts;
          if (parts.length < 2) {
            return "❌ Invalid input format. Expected: 'name,description'";
          }

          name = parts[0];
          description = parts[1];
          if (parts[2]) {
            const maxSupplyNum = parseInt(parts[2]);
            if (!isNaN(maxSupplyNum) && maxSupplyNum > 0) {
              maxSupply = maxSupplyNum;
            }
          }
          if (parts[3]) {
            iconUrl = parts[3];
          }
        } else {
          if (!parsed.name || !parsed.description) {
            return "❌ Missing required parameters: name and description";
          }

          name = parsed.name;
          description = parsed.description;
          if (parsed.maxSupply) {
            const maxSupplyNum = parseInt(parsed.maxSupply);
            if (!isNaN(maxSupplyNum) && maxSupplyNum > 0) {
              maxSupply = maxSupplyNum;
            }
          }
          if (parsed.iconUrl) {
            iconUrl = parsed.iconUrl;
          }
        }

        if (!name || name.length === 0) {
          return "❌ Collection name cannot be empty";
        }

        if (!description || description.length === 0) {
          return "❌ Collection description cannot be empty";
        }

        const canCreate = await tokenService.canCreateTokens(wallet.getAddress());
        if (!canCreate) {
          return "❌ Insufficient XRD balance for NFT collection creation. Need at least 5 XRD.";
        }

        const currentEpoch = await gatewayClient.getCurrentEpoch();

        const txHash = await tokenService.createNonFungibleResource(
          {
            name: name,
            description: description,
            maxSupply: maxSupply,
            iconUrl: iconUrl,
          },
          wallet,
          currentEpoch
        );

        // Extract the resource address from the transaction receipt
        const resourceAddress = await extractNFTResourceAddress(gatewayClient, txHash);
        
        if (resourceAddress) {
          return `✅ ${name} NFT collection created successfully.\n🔗 Resource: ${resourceAddress}\n📝 Transaction: ${txHash}`;
        } else {
          return `✅ ${name} NFT collection transaction submitted: ${txHash}\n⏳ Resource address will be available once the transaction is confirmed.`;
        }

      } catch (error) {
        console.error("Error creating non-fungible resource:", error);
        return `❌ Failed to create NFT collection: ${formatError(error)}`;
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
 * Format transaction result for user display
 */
function formatTransactionResult(txHash: string, operation: string): string {
  return `✅ ${operation} completed successfully. Transaction: ${txHash.slice(
    0,
    16
  )}...`;
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
export class CreateNonFungibleResourceTool {
  name = "create_non_fungible_resource";
  description = "Create a new NFT collection. Input format: 'name,description' or JSON: {'name': 'MyNFTs', 'description': 'My NFT Collection', 'maxSupply': 10000, 'iconUrl': 'https://...'}";

  constructor(
    private gatewayClient: RadixGatewayClient,
    private transactionBuilder: RadixTransactionBuilder,
    private wallet: RadixWallet,
    private networkId: number
  ) {}

  async _call(input: string): Promise<string> {
    const tool = createCreateNonFungibleResourceTool(
      this.gatewayClient,
      this.transactionBuilder,
      this.wallet,
      this.networkId
    );
    return tool.func({ input });
  }
} 