import { RadixGatewayClient } from "../../radix/RadixGatewayClient";
import { RadixTransactionBuilder } from "../../radix/RadixTransactionBuilder";
import { RadixWallet } from "../../radix/RadixWallet";
import { Token } from "../../radix/Token";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * Factory function to create a mint fungible tokens tool
 */
export function createMintFungibleResourceTool(
  gatewayClient: RadixGatewayClient,
  transactionBuilder: RadixTransactionBuilder,
  wallet: RadixWallet,
  networkId: number
): DynamicStructuredTool {
  const tokenService = new Token(transactionBuilder, gatewayClient, networkId);

  return new DynamicStructuredTool({
    name: "mint_fungible_resource",
    description: "Mint additional fungible tokens to an existing resource (requires minter privileges). Input format: 'resourceAddress,amount[,toAccount]' or JSON: {'resourceAddress': 'resource_...', 'amount': '1000', 'toAccount': 'account_...'} (toAccount defaults to current wallet)",
    schema: z.object({
      input: z.string().describe("Mint fungible tokens parameters"),
    }),
    func: async ({ input }) => {
      try {
        const inputStr = input.trim();
        console.log('🔨 MintFungibleResourceTool input:', inputStr);

        // Parse input: resourceAddress,amount[,toAccount]
        const parts = inputStr.split(',').map((s: string) => s.trim());
        if (parts.length < 2 || parts.length > 3) {
          throw new Error('Invalid input format. Expected: resourceAddress,amount[,toAccount]');
        }

        const [resourceAddress, amount, toAccount] = parts;
        const targetAccount = toAccount || wallet.getAddress();

        console.log(`🎯 Minting ${amount} tokens of ${resourceAddress} to ${targetAccount}`);

        // Validate addresses
        if (!resourceAddress.startsWith('resource_')) {
          throw new Error('Invalid resource address format');
        }

        // Get current epoch
        const currentEpoch = await gatewayClient.getCurrentEpoch();

        // Use Token class to mint fungible tokens with correct parameters
        const txHash = await tokenService.mintFungible(
          resourceAddress,
          amount,
          targetAccount,
          wallet,
          currentEpoch
        );

        return formatTransactionResult(
          txHash,
          `Minted ${formatBalance(amount)} tokens from resource ${resourceAddress.substring(0, 20)}... to ${targetAccount.substring(0, 20)}...`
        );
      } catch (error) {
        console.error('❌ MintFungibleResourceTool error:', error);
        return `❌ Failed to mint tokens: ${formatError(error)}`;
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
 * Format transaction result with emojis and clear messaging
 */
function formatTransactionResult(txHash: string, description: string): string {
  return `✅ ${description}\n📝 Transaction: ${txHash}\n🌐 Track: https://stokenet-dashboard.radixdlt.com/transaction/${txHash}`;
}

/**
 * Format balance for display
 */
function formatBalance(amount: string | number, symbol?: string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  const formatted = num.toLocaleString();
  return symbol ? `${formatted} ${symbol}` : formatted;
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
export class MintFungibleResourceTool {
  name = "mint_fungible_resource";
  description = "Mint additional fungible tokens to an existing resource (requires minter privileges). Input format: 'resourceAddress,amount[,toAccount]' or JSON: {'resourceAddress': 'resource_...', 'amount': '1000', 'toAccount': 'account_...'}";

  constructor(
    private gatewayClient: RadixGatewayClient,
    private transactionBuilder: RadixTransactionBuilder,
    private wallet: RadixWallet,
    private networkId: number
  ) {}

  async _call(input: string): Promise<string> {
    const tool = createMintFungibleResourceTool(
      this.gatewayClient,
      this.transactionBuilder,
      this.wallet,
      this.networkId
    );
    return tool.func({ input });
  }
} 