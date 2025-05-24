import { RadixTool } from "./RadixTool";
import { RadixGatewayClient } from "../../radix/RadixGatewayClient";
import { RadixTransactionBuilder } from "../../radix/RadixTransactionBuilder";
import { RadixWallet } from "../../radix/RadixWallet";

/**
 * Tool for retrieving account balances from the Radix ledger
 */
export class GetBalancesTool extends RadixTool {
  name = "get_balances";
  description =
    "Lists all token balances of a given account. Input: account address (optional, defaults to agent's account)";

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

      // Get account balances
      const balancesResponse = await this.gatewayClient.getAccountBalances(
        accountAddress
      );

      if (!balancesResponse.items || balancesResponse.items.length === 0) {
        return `❌ Account not found or has no balances: ${accountAddress}`;
      }

      const accountData = balancesResponse.items[0];
      const balances: string[] = [];

      // Process fungible resources (tokens)
      if (accountData.fungible_resources?.items) {
        for (const resource of accountData.fungible_resources.items) {
          const amount = parseFloat(resource.amount);
          if (amount > 0) {
            // Get resource metadata for symbol/name
            let symbol = "Unknown";
            if (resource.metadata?.items) {
              const symbolMeta = resource.metadata.items.find(
                (item: any) => item.key === "symbol"
              );
              if (symbolMeta?.value?.typed?.value) {
                symbol = symbolMeta.value.typed.value;
              }
            }

            // Check if it's XRD
            if (resource.resource_address === this.getXRDResourceAddress()) {
              symbol = "XRD";
            }

            balances.push(this.formatBalance(resource.amount, symbol));
          }
        }
      }

      // Process non-fungible resources (NFTs)
      if (accountData.non_fungible_resources?.items) {
        for (const resource of accountData.non_fungible_resources.items) {
          const count = parseInt(resource.amount);
          if (count > 0) {
            let name = "NFT";
            if (resource.metadata?.items) {
              const nameMeta = resource.metadata.items.find(
                (item: any) => item.key === "name"
              );
              if (nameMeta?.value?.typed?.value) {
                name = nameMeta.value.typed.value;
              }
            }
            balances.push(`${count} ${name} NFT(s)`);
          }
        }
      }

      if (balances.length === 0) {
        return `📊 Account ${accountAddress.slice(
          0,
          16
        )}... has no token balances.`;
      }

      const addressDisplay =
        accountAddress === this.getAgentAddress()
          ? "Your account"
          : `Account ${accountAddress.slice(0, 16)}...`;

      return `📊 ${addressDisplay} balances:\n${balances
        .map((balance) => `• ${balance}`)
        .join("\n")}`;
    } catch (error) {
      console.error("Error getting balances:", error);
      return `❌ Failed to get balances: ${this.formatError(error)}`;
    }
  }
}
