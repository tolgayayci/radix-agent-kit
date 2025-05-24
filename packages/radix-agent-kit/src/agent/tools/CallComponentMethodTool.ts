import { RadixTool } from "./RadixTool";
import { RadixGatewayClient } from "../../radix/RadixGatewayClient";
import { RadixTransactionBuilder } from "../../radix/RadixTransactionBuilder";
import { RadixWallet } from "../../radix/RadixWallet";

/**
 * Tool for calling methods on Radix components
 */
export class CallComponentMethodTool extends RadixTool {
  name = "call_component_method";
  description =
    "Call a method on a Radix component. Input format: 'componentAddress,methodName[,arg1,arg2,...]' or JSON: {'componentAddress': 'component_...', 'methodName': 'method_name', 'args': ['arg1', 'arg2']}";

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
      let componentAddress: string;
      let methodName: string;
      let args: any[] = [];

      // Parse input
      const parsed = this.parseInput(input);

      if (parsed.parts) {
        // Handle comma-separated format
        const parts = parsed.parts;
        if (parts.length < 2) {
          return "❌ Invalid input format. Expected: 'componentAddress,methodName[,arg1,arg2,...]'";
        }

        componentAddress = parts[0];
        methodName = parts[1];
        // Remaining parts are arguments
        args = parts.slice(2);
      } else {
        // Handle JSON format
        if (!parsed.componentAddress || !parsed.methodName) {
          return "❌ Missing required parameters: componentAddress and methodName";
        }

        componentAddress = parsed.componentAddress;
        methodName = parsed.methodName;
        args = parsed.args || [];
      }

      // Validate inputs
      if (!this.isValidAddress(componentAddress)) {
        return `❌ Invalid component address: ${componentAddress}`;
      }

      if (!methodName || methodName.length === 0) {
        return "❌ Method name cannot be empty";
      }

      // Get current epoch
      const currentEpoch = await this.getCurrentEpoch();

      // Call the component method using the component service
      const txHash = await this.componentService.callComponentMethod(
        {
          ownerAddress: this.getAgentAddress(),
          componentAddress: componentAddress,
          method: methodName,
          args: args,
        },
        this.wallet,
        currentEpoch
      );

      const componentDisplay = `${componentAddress.slice(0, 16)}...`;
      const argsDisplay =
        args.length > 0 ? ` with args: [${args.join(", ")}]` : "";

      return this.formatTransactionResult(
        txHash,
        `Called method '${methodName}' on component ${componentDisplay}${argsDisplay}`
      );
    } catch (error) {
      console.error("Error calling component method:", error);
      return `❌ Failed to call component method: ${this.formatError(error)}`;
    }
  }
}
