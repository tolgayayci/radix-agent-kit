import { RadixTool } from "./RadixTool";
import { RadixGatewayClient } from "../../radix/RadixGatewayClient";
import { RadixTransactionBuilder } from "../../radix/RadixTransactionBuilder";
import { RadixWallet } from "../../radix/RadixWallet";

/**
 * Tool for creating new fungible token resources
 */
export class CreateFungibleResourceTool extends RadixTool {
  name = "create_fungible_resource";
  description =
    "Create a new fungible token resource. Input format: 'name,symbol,initialSupply[,divisibility]' or JSON: {'name': 'MyToken', 'symbol': 'MTK', 'initialSupply': '1000000', 'divisibility': 18}";

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
      let name: string;
      let symbol: string;
      let initialSupply: string;
      let divisibility: number = 18; // Default divisibility

      // Parse input
      const parsed = this.parseInput(input);

      if (parsed.parts) {
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
      const parsedSupply = this.parseAmount(initialSupply);

      // Check if agent has enough XRD for token creation
      const canCreate = await this.tokenService.canCreateTokens(
        this.getAgentAddress()
      );
      if (!canCreate) {
        return "❌ Insufficient XRD balance for token creation. Need at least 5 XRD.";
      }

      // Get current epoch
      const currentEpoch = await this.getCurrentEpoch();

      // Create the fungible resource
      const txHash = await this.tokenService.createFungibleResource(
        {
          name: name,
          symbol: symbol,
          initialSupply: parsedSupply,
          divisibility: divisibility,
          description: `${name} token created by Radix Agent Kit`,
        },
        this.wallet,
        currentEpoch
      );

      return this.formatTransactionResult(
        txHash,
        `Created ${name} (${symbol}) token with ${this.formatBalance(
          parsedSupply,
          symbol
        )} initial supply`
      );
    } catch (error) {
      console.error("Error creating fungible resource:", error);
      return `❌ Failed to create fungible resource: ${this.formatError(
        error
      )}`;
    }
  }
}
