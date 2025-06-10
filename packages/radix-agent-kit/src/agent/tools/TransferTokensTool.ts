import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { RadixGatewayClient } from "../../radix/RadixGatewayClient";
import { RadixTransactionBuilder } from "../../radix/RadixTransactionBuilder";
import { RadixWallet } from "../../radix/RadixWallet";
import { Token } from "../../radix/Token";

/**
 * Enhanced tool for transferring both fungible and non-fungible tokens between accounts
 */
export function createTransferTokensTool(
  gatewayClient: RadixGatewayClient,
  transactionBuilder: RadixTransactionBuilder,
  wallet: RadixWallet,
  networkId: number
): DynamicStructuredTool {
  const tokenService = new Token(transactionBuilder, gatewayClient, networkId);
  
  return new DynamicStructuredTool({
    name: "transfer_tokens",
    description: "Transfer fungible tokens or NFTs from the agent's account to another account. For fungible: 'toAddress,amount[,resourceAddress]' or JSON: {'toAddress': 'account_...', 'amount': '100', 'resourceAddress': 'resource_...'}\nFor NFTs: 'toAddress,resourceAddress,nftId' or JSON: {'toAddress': 'account_...', 'resourceAddress': 'resource_...', 'nftId': '001'}",
    schema: z.object({
      input: z.string().describe("Transfer parameters - can be comma-separated or JSON format"),
    }),
    func: async ({ input }) => {
      try {
        // Validate input
        if (!input || input.trim().length === 0) {
          return "❌ Invalid input. Please provide transfer parameters.\nFor fungible: 'toAddress,amount[,resourceAddress]' or JSON: {'toAddress': 'account_...', 'amount': '100', 'resourceAddress': 'resource_...'}\nFor NFTs: 'toAddress,resourceAddress,nftId' or JSON: {'toAddress': 'account_...', 'resourceAddress': 'resource_...', 'nftId': '001'}";
        }

        let toAddress: string;
        let amount: string | undefined;
        let resourceAddress: string;
        let nftId: string | undefined;

        // Parse input
        const parsed = parseInput(input);

        if (parsed.parts && parsed.parts.length > 0) {
          // Handle comma-separated format
          const parts = parsed.parts;
          if (parts.length < 2) {
            return "❌ Invalid input format. Expected at least 'toAddress,amount' for fungible or 'toAddress,resourceAddress,nftId' for NFT";
          }

          toAddress = parts[0];
          
          // Detect if this is an NFT transfer (3 parts with last being NFT ID)
          if (parts.length === 3 && !isNumeric(parts[2])) {
            // NFT transfer: toAddress,resourceAddress,nftId
            resourceAddress = parts[1];
            nftId = parts[2];
          } else {
            // Fungible transfer: toAddress,amount[,resourceAddress]
            amount = parts[1];
            resourceAddress = parts[2] || transactionBuilder.getXRDResourceAddress();
          }
        } else {
          // Handle JSON format
          if (!parsed.toAddress) {
            return "❌ Missing required parameter: toAddress";
          }

          toAddress = parsed.toAddress;
          amount = parsed.amount;
          resourceAddress = parsed.resourceAddress || transactionBuilder.getXRDResourceAddress();
          nftId = parsed.nftId;
        }

        // Validate addresses
        if (!transactionBuilder.isValidAddress(toAddress)) {
          return `❌ Invalid destination address: ${toAddress}`;
        }

        if (!transactionBuilder.isValidAddress(resourceAddress)) {
          return `❌ Invalid resource address: ${resourceAddress}`;
        }

        // Get current epoch
        const currentEpoch = await gatewayClient.getCurrentEpoch();

        // Determine transfer type and execute
        if (nftId) {
          // NFT Transfer
          const txHash = await tokenService.transferNonFungible(
            resourceAddress,
            nftId,
            wallet.getAddress(),
            toAddress,
            wallet,
            currentEpoch
          );

          const toAddressDisplay = `${toAddress.slice(0, 16)}...`;
          const resourceDisplay = `${resourceAddress.slice(0, 16)}...`;

          return `✅ Transfer of NFT ${nftId} from collection ${resourceDisplay} to ${toAddressDisplay} completed successfully.\n📝 Transaction: ${txHash}\n🌐 Track: https://stokenet-dashboard.radixdlt.com/transaction/${txHash}`;
        } else {
          // Fungible Token Transfer
          if (!amount) {
            return "❌ Amount is required for fungible token transfers";
          }

          // Parse and validate amount
          const parsed = parseFloat(amount);
          if (isNaN(parsed) || parsed <= 0) {
            return `❌ Invalid amount: ${amount}. Must be a positive number.`;
          }
          const parsedAmount = parsed.toString();

          const txHash = await tokenService.transferFungible(
            {
              fromAccount: wallet.getAddress(),
              toAccount: toAddress,
              resourceAddress: resourceAddress,
              amount: parsedAmount,
            },
            wallet,
            currentEpoch
          );

          // Determine token symbol for display
          let tokenSymbol = "tokens";
          if (resourceAddress === transactionBuilder.getXRDResourceAddress()) {
            tokenSymbol = "XRD";
          } else {
            try {
              const tokenInfo = await tokenService.getTokenInfo(resourceAddress);
              if (tokenInfo.items?.[0]?.metadata?.items) {
                const symbolMeta = tokenInfo.items[0].metadata.items.find(
                  (item: any) => item.key === "symbol"
                );
                if (
                  symbolMeta?.value?.typed?.type === "String" &&
                  symbolMeta.value.typed.value
                ) {
                  tokenSymbol = symbolMeta.value.typed.value;
                }
              }
            } catch (error) {
              // If we can't get token info, just use generic "tokens"
              console.warn("Could not fetch token metadata:", error);
            }
          }

          const toAddressDisplay = `${toAddress.slice(0, 16)}...`;
          const formatted = parseFloat(parsedAmount).toLocaleString();

          return `✅ Transfer of ${formatted} ${tokenSymbol} to ${toAddressDisplay} completed successfully.\n📝 Transaction: ${txHash}\n🌐 Track: https://stokenet-dashboard.radixdlt.com/transaction/${txHash}`;
        }
      } catch (error) {
        console.error("Error transferring tokens:", error);
        return `❌ Failed to transfer tokens: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
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
 * Check if a string represents a numeric value
 */
function isNumeric(str: string): boolean {
  return !isNaN(parseFloat(str)) && isFinite(parseFloat(str));
}
