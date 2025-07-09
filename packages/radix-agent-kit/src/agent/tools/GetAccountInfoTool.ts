import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { RadixGatewayClient } from "../../radix/RadixGatewayClient";
import { RadixTransactionBuilder } from "../../radix/RadixTransactionBuilder";
import { RadixWallet } from "../../radix/RadixWallet";

/**
 * Tool for retrieving account information from the Radix ledger
 */
export function createGetAccountInfoTool(
  gatewayClient: RadixGatewayClient,
  transactionBuilder: RadixTransactionBuilder,
  wallet: RadixWallet,
  networkId: number
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "get_account_info",
    description: "Use this tool when users ask for 'account information', 'account details', 'account info', or want to know about their account. Retrieves account data including address, public key, and metadata. For balance queries, use the get_balances tool instead. Call this for queries like 'show my account info', 'what is my account information', 'account details', etc.",
    schema: z.object({
      account_address: z.string().optional().describe("Account address to get information for (optional, defaults to agent's account)")
    }),
    func: async ({ account_address }) => {
      try {
        // Use agent's address if no input provided
        const accountAddress = account_address || wallet.getAddress();

        // Validate address format
        if (!transactionBuilder.isValidAddress(accountAddress)) {
          return `❌ Invalid account address format: ${accountAddress}`;
        }

        // Get basic account info first
        const accountInfo = await gatewayClient.getEntityDetails(accountAddress, {
          opt_ins: {
            explicit_metadata: ["name", "description", "account_type"],
            ancestor_identities: false,
            component_royalty_config: false,
            component_royalty_vault_balance: false,
            package_royalty_vault_balance: false,
            non_fungible_include_nfids: false,
          }
        });

        if (!accountInfo.items || accountInfo.items.length === 0) {
          return `❌ Account not found: ${accountAddress}`;
        }

        const account = accountInfo.items[0];
        const metadata = account.metadata?.items || [];

        // Extract metadata
        const getMetadataValue = (key: string): string | undefined => {
          const item = metadata.find((item: any) => item.key === key);
          if (!item?.value?.typed) return undefined;
          const typed = item.value.typed as any;
          if (typed.type === "String" && typed.value) {
            return typed.value;
          }
          return undefined;
        };

        const accountName = getMetadataValue("name");
        const accountDescription = getMetadataValue("description");
        const accountType = getMetadataValue("account_type");

        // Build response WITHOUT balance first
        let response = `🏦 Account Information:\n`;
        response += `• Address: ${accountAddress}\n`;

        if (accountName) {
          response += `• Name: ${accountName}\n`;
        }

        if (accountDescription) {
          response += `• Description: ${accountDescription}\n`;
        }

        if (accountType) {
          response += `• Type: ${accountType}\n`;
        }

        // Add public key if available
        if (account.details && typeof account.details === "object") {
          const details = account.details as any;
          if (details.state?.public_key) {
            response += `• Public Key: ${details.state.public_key.slice(0, 16)}...`;
          }
        }

        return response.trim();
      } catch (error) {
        console.error("Error getting account info:", error);
        return `❌ Failed to get account info: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
  });
}
