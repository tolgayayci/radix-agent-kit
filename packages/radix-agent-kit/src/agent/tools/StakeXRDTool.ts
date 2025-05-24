import { RadixTool } from "./RadixTool";
import { RadixGatewayClient } from "../../radix/RadixGatewayClient";
import { RadixTransactionBuilder } from "../../radix/RadixTransactionBuilder";
import { RadixWallet } from "../../radix/RadixWallet";

/**
 * Tool for staking XRD with validators
 */
export class StakeXRDTool extends RadixTool {
  name = "stake_xrd";
  description =
    "Stake XRD tokens with a validator to earn rewards. Input format: 'validatorAddress,amount' or JSON: {'validatorAddress': 'component_...', 'amount': '100'}";

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
      let validatorAddress: string;
      let amount: string;

      // Parse input
      const parsed = this.parseInput(input);

      if (parsed.parts) {
        // Handle comma-separated format
        const parts = parsed.parts;
        if (parts.length < 2) {
          return "❌ Invalid input format. Expected: 'validatorAddress,amount'";
        }

        validatorAddress = parts[0];
        amount = parts[1];
      } else {
        // Handle JSON format
        if (!parsed.validatorAddress || !parsed.amount) {
          return "❌ Missing required parameters: validatorAddress and amount";
        }

        validatorAddress = parsed.validatorAddress;
        amount = parsed.amount;
      }

      // Validate inputs
      if (!this.isValidAddress(validatorAddress)) {
        return `❌ Invalid validator address: ${validatorAddress}`;
      }

      // Parse and validate amount
      const parsedAmount = this.parseAmount(amount);

      // Check if agent has enough XRD
      try {
        const balances = await this.gatewayClient.getAccountBalances(
          this.getAgentAddress()
        );
        const xrdBalance = balances.items?.[0]?.fungible_resources?.items?.find(
          (resource: any) =>
            resource.resource_address === this.getXRDResourceAddress()
        );

        if (
          !xrdBalance ||
          parseFloat(xrdBalance.amount) < parseFloat(parsedAmount)
        ) {
          return `❌ Insufficient XRD balance. Available: ${
            xrdBalance ? this.formatBalance(xrdBalance.amount) : "0 XRD"
          }, Required: ${this.formatBalance(parsedAmount)}`;
        }
      } catch (error) {
        console.warn("Could not check XRD balance:", error);
      }

      // Get current epoch
      const currentEpoch = await this.getCurrentEpoch();

      // Perform the staking using the DeFi service
      const txHash = await this.defiService.stakeXRD(
        {
          ownerAddress: this.getAgentAddress(),
          validatorAddress: validatorAddress,
          amount: parsedAmount,
        },
        this.wallet,
        currentEpoch
      );

      const validatorDisplay = `${validatorAddress.slice(0, 16)}...`;

      return this.formatTransactionResult(
        txHash,
        `Staked ${this.formatBalance(
          parsedAmount
        )} with validator ${validatorDisplay}`
      );
    } catch (error) {
      console.error("Error staking XRD:", error);
      return `❌ Failed to stake XRD: ${this.formatError(error)}`;
    }
  }
}
