import { RadixTool } from "./RadixTool";
import { RadixGatewayClient } from "../../radix/RadixGatewayClient";
import { RadixTransactionBuilder } from "../../radix/RadixTransactionBuilder";
import { RadixWallet } from "../../radix/RadixWallet";

/**
 * Tool for transferring tokens between accounts
 */
export class TransferTokensTool extends RadixTool {
  name = "transfer_tokens";
  description =
    "Transfer tokens from the agent's account to another account. Input format: 'toAddress,amount,resourceAddress' or JSON: {'toAddress': 'account_...', 'amount': '100', 'resourceAddress': 'resource_...'} (resourceAddress optional, defaults to XRD)";

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
      let toAddress: string;
      let amount: string;
      let resourceAddress: string;

      // Parse input
      const parsed = this.parseInput(input);

      if (parsed.parts) {
        // Handle comma-separated format
        const parts = parsed.parts;
        if (parts.length < 2) {
          return "❌ Invalid input format. Expected: 'toAddress,amount[,resourceAddress]'";
        }

        toAddress = parts[0];
        amount = parts[1];
        resourceAddress = parts[2] || this.getXRDResourceAddress();
      } else {
        // Handle JSON format
        if (!parsed.toAddress || !parsed.amount) {
          return "❌ Missing required parameters: toAddress and amount";
        }

        toAddress = parsed.toAddress;
        amount = parsed.amount;
        resourceAddress =
          parsed.resourceAddress || this.getXRDResourceAddress();
      }

      // Validate inputs
      if (!this.isValidAddress(toAddress)) {
        return `❌ Invalid destination address: ${toAddress}`;
      }

      if (!this.isValidAddress(resourceAddress)) {
        return `❌ Invalid resource address: ${resourceAddress}`;
      }

      // Parse and validate amount
      const parsedAmount = this.parseAmount(amount);

      // Get current epoch
      const currentEpoch = await this.getCurrentEpoch();

      // Perform the transfer using the token service
      const txHash = await this.tokenService.transferFungible(
        {
          fromAccount: this.getAgentAddress(),
          toAccount: toAddress,
          resourceAddress: resourceAddress,
          amount: parsedAmount,
        },
        this.wallet,
        currentEpoch
      );

      // Determine token symbol for display
      let tokenSymbol = "tokens";
      if (resourceAddress === this.getXRDResourceAddress()) {
        tokenSymbol = "XRD";
      } else {
        try {
          const tokenInfo = await this.tokenService.getTokenInfo(
            resourceAddress
          );
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

      return this.formatTransactionResult(
        txHash,
        `Transfer of ${this.formatBalance(
          parsedAmount,
          tokenSymbol
        )} to ${toAddressDisplay}`
      );
    } catch (error) {
      console.error("Error transferring tokens:", error);
      return `❌ Failed to transfer tokens: ${this.formatError(error)}`;
    }
  }
}
