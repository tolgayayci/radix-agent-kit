import { RadixTool } from "./RadixTool";
import { RadixGatewayClient } from "../../radix/RadixGatewayClient";
import { RadixTransactionBuilder } from "../../radix/RadixTransactionBuilder";
import { RadixWallet } from "../../radix/RadixWallet";

/**
 * Tool for retrieving account information from the Radix ledger
 */
export class GetAccountInfoTool extends RadixTool {
  name = "get_account_info";
  description =
    "Retrieves detailed information about a Radix account including address, public key, and metadata. Input: account address (optional, defaults to agent's account)";

  constructor(
    gatewayClient: RadixGatewayClient,
    transactionBuilder: RadixTransactionBuilder,
    wallet: RadixWallet,
    networkId: number
  ) {
    super(gatewayClient, transactionBuilder, wallet, networkId);
  }

  async _call(input: string): Promise<string> {
    try {
      const trimmedInput = input.trim();

      // Use agent's address if no input provided
      const accountAddress = trimmedInput || this.getAgentAddress();

      // Validate address format
      if (!this.isValidAddress(accountAddress)) {
        return `❌ Invalid account address format: ${accountAddress}`;
      }

      // Get account information
      const accountInfo = await this.gatewayClient.getEntityDetails(
        accountAddress,
        {
          opt_ins: {
            explicit_metadata: ["name", "description", "account_type"],
            ancestor_identities: false,
            component_royalty_config: false,
            component_royalty_vault_balance: false,
            package_royalty_vault_balance: false,
            non_fungible_include_nfids: false,
          },
        }
      );

      if (!accountInfo.items || accountInfo.items.length === 0) {
        return `❌ Account not found: ${accountAddress}`;
      }

      const account = accountInfo.items[0];
      const metadata = account.metadata?.items || [];

      // Extract metadata with proper type handling
      const getMetadataValue = (key: string): string | undefined => {
        const item = metadata.find((item: any) => item.key === key);
        if (!item?.value?.typed) return undefined;

        // Handle different metadata value types
        const typed = item.value.typed as any;
        if (typed.type === "String" && typed.value) {
          return typed.value;
        }
        return undefined;
      };

      const accountName = getMetadataValue("name");
      const accountDescription = getMetadataValue("description");
      const accountType = getMetadataValue("account_type");

      // Build response
      const addressDisplay =
        accountAddress === this.getAgentAddress()
          ? "Your account"
          : `Account ${accountAddress.slice(0, 16)}...`;

      let response = `🏦 ${addressDisplay} Information:\n`;
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
          response += `• Public Key: ${details.state.public_key.slice(
            0,
            16
          )}...\n`;
        }
      }

      // Get basic balance info
      try {
        const balancesResponse = await this.gatewayClient.getAccountBalances(
          accountAddress
        );
        if (balancesResponse.items?.[0]?.fungible_resources?.items) {
          const xrdBalance =
            balancesResponse.items[0].fungible_resources.items.find(
              (resource: any) =>
                resource.resource_address === this.getXRDResourceAddress()
            );
          if (xrdBalance) {
            response += `• XRD Balance: ${this.formatBalance(
              xrdBalance.amount
            )}\n`;
          }
        }
      } catch (error) {
        // Balance fetch failed, but account info is still valid
        console.warn("Could not fetch balance for account info:", error);
      }

      return response.trim();
    } catch (error) {
      console.error("Error getting account info:", error);
      return `❌ Failed to get account info: ${this.formatError(error)}`;
    }
  }
}
