import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { RadixGatewayClient } from "../../radix/RadixGatewayClient";
import { RadixTransactionBuilder } from "../../radix/RadixTransactionBuilder";
import { RadixWallet } from "../../radix/RadixWallet";
import { Token } from "../../radix/Token";

/**
 * Tool for transferring tokens between accounts
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
    description: "Transfer tokens from the agent's account to another account",
    schema: z.object({
      toAddress: z.string().describe("The recipient account address"),
      amount: z.string().describe("The amount of tokens to transfer"),
      resourceAddress: z.string().optional().describe("The resource address of the token (optional, defaults to XRD)")
    }),
    func: async ({ toAddress, amount, resourceAddress }) => {
      try {
        // Use XRD if no resource address provided
        const tokenResourceAddress = resourceAddress || transactionBuilder.getXRDResourceAddress();

        // Validate inputs
        if (!transactionBuilder.isValidAddress(toAddress)) {
          return `❌ Invalid destination address: ${toAddress}`;
        }

        if (!transactionBuilder.isValidAddress(tokenResourceAddress)) {
          return `❌ Invalid resource address: ${tokenResourceAddress}`;
        }

        // Parse and validate amount
        const parsed = typeof amount === "string" ? parseFloat(amount) : amount;
        if (isNaN(parsed) || parsed <= 0) {
          throw new Error(`Invalid amount: ${amount}. Must be a positive number.`);
        }
        const parsedAmount = parsed.toString();

        // Get current epoch
        const currentEpoch = await gatewayClient.getCurrentEpoch();

        // Perform the transfer using the token service
        const txHash = await tokenService.transferFungible(
          {
            fromAccount: wallet.getAddress(),
            toAccount: toAddress,
            resourceAddress: tokenResourceAddress,
            amount: parsedAmount,
          },
          wallet,
          currentEpoch
        );

        // Determine token symbol for display
        let tokenSymbol = "tokens";
        if (tokenResourceAddress === transactionBuilder.getXRDResourceAddress()) {
          tokenSymbol = "XRD";
        } else {
          try {
            const tokenInfo = await tokenService.getTokenInfo(tokenResourceAddress);
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

        return `✅ Transfer of ${formatted} ${tokenSymbol} to ${toAddressDisplay} completed successfully. Transaction: ${txHash.slice(0, 16)}...`;
      } catch (error) {
        console.error("Error transferring tokens:", error);
        return `❌ Failed to transfer tokens: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
  });
}
