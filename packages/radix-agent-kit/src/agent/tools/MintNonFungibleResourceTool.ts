import { RadixGatewayClient } from "../../radix/RadixGatewayClient";
import { RadixTransactionBuilder } from "../../radix/RadixTransactionBuilder";
import { RadixWallet } from "../../radix/RadixWallet";
import { Token } from "../../radix/Token";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * Factory function to create a mint non-fungible tokens tool
 */
export function createMintNonFungibleResourceTool(
  gatewayClient: RadixGatewayClient,
  transactionBuilder: RadixTransactionBuilder,
  wallet: RadixWallet,
  networkId: number
): DynamicStructuredTool {
  const tokenService = new Token(transactionBuilder, gatewayClient, networkId);

  return new DynamicStructuredTool({
    name: "mint_non_fungible_resource",
    description: "Mint new NFTs to an existing NFT collection (requires minter privileges). Input format: 'resourceAddress,toAccount[,nftId,metadata]' or JSON: {'resourceAddress': 'resource_...', 'toAccount': 'account_...', 'nftId': '001', 'metadata': {'name': 'Cool NFT', 'image': 'https://...'}}",
    schema: z.object({
      input: z.string().describe("Mint NFT parameters"),
    }),
    func: async ({ input }) => {
      try {
        const inputStr = input.trim();
        console.log('🎨 MintNonFungibleResourceTool input:', inputStr);

        let parsed: any;
        try {
          parsed = JSON.parse(inputStr);
        } catch {
          throw new Error('Invalid input format. Expected JSON: {"resourceAddress": "resource_...", "toAccount": "account_...", "nftId": "001", "metadata": {"name": "NFT Name", "image": "https://..."}}');
        }

        const { resourceAddress, toAccount, nftId, metadata } = parsed;

        if (!resourceAddress || !toAccount) {
          throw new Error('Missing required parameters: resourceAddress and toAccount');
        }

        const finalNftId = nftId || `${Date.now()}`;
        const finalMetadata = metadata || { name: `NFT ${finalNftId}` };

        console.log(`🎯 Minting NFT ${finalNftId} to ${resourceAddress} for ${toAccount}`);

        // Validate addresses
        if (!resourceAddress.startsWith('resource_')) {
          throw new Error('Invalid resource address format');
        }

        if (!toAccount.startsWith('account_')) {
          throw new Error('Invalid account address format');
        }

        // Get current epoch
        const currentEpoch = await gatewayClient.getCurrentEpoch();

        // Use Token class to mint NFT with correct parameters
        const txHash = await tokenService.mintNonFungible(
          resourceAddress,
          toAccount,
          { nftId: finalNftId, metadata: finalMetadata },
          wallet,
          currentEpoch
        );

        return formatTransactionResult(
          txHash,
          `Minted NFT ${finalNftId} from resource ${resourceAddress.substring(0, 20)}... to ${toAccount.substring(0, 20)}...`
        );
      } catch (error) {
        console.error('❌ MintNonFungibleResourceTool error:', error);
        return `❌ Failed to mint NFT: ${formatError(error)}`;
      }
    },
  });
}

/**
 * Parse input string that can be comma-separated or JSON
 */
function parseInput(input: string): any {
  try {
    return JSON.parse(input);
  } catch {
    const trimmed = input.trim();
    if (trimmed.includes(',')) {
      const parts = trimmed.split(',').map(part => part.trim());
      return { parts };
    }
    return {};
  }
}

/**
 * Format transaction result with emojis and clear messaging
 */
function formatTransactionResult(txHash: string, description: string): string {
  return `✅ ${description}\n📝 Transaction: ${txHash}\n🌐 Track: https://stokenet-dashboard.radixdlt.com/transaction/${txHash}`;
}

/**
 * Format error messages consistently
 */
function formatError(error: any): string {
  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  return 'Unknown error occurred';
}

// Keep class for backward compatibility
export class MintNonFungibleResourceTool {
  name = "mint_non_fungible_resource";
  description = "Mint new NFTs to an existing NFT collection (requires minter privileges). Input format: 'resourceAddress,toAccount[,nftId,metadata]' or JSON: {'resourceAddress': 'resource_...', 'toAccount': 'account_...', 'nftId': '001', 'metadata': {'name': 'Cool NFT', 'image': 'https://...'}}";

  constructor(
    private gatewayClient: RadixGatewayClient,
    private transactionBuilder: RadixTransactionBuilder,
    private wallet: RadixWallet,
    private networkId: number
  ) {}

  async _call(input: string): Promise<string> {
    const tool = createMintNonFungibleResourceTool(
      this.gatewayClient,
      this.transactionBuilder,
      this.wallet,
      this.networkId
    );
    return tool.func({ input });
  }
} 