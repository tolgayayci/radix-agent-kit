import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { RadixGatewayClient } from "../../radix/RadixGatewayClient";
import { RadixTransactionBuilder } from "../../radix/RadixTransactionBuilder";
import { RadixWallet } from "../../radix/RadixWallet";
import { Component } from "../../radix/Component";

/**
 * Factory function to create a tool for calling methods on Radix components
 */
export function createCallComponentMethodTool(
  gatewayClient: RadixGatewayClient,
  transactionBuilder: RadixTransactionBuilder,
  wallet: RadixWallet,
  networkId: number
) {
  const componentService = new Component(transactionBuilder, gatewayClient, networkId);

  return new DynamicStructuredTool({
    name: "call_component_method",
    description: "Call a method on a Radix component. Input format: 'componentAddress,methodName[,arg1,arg2,...]' or JSON: {'componentAddress': 'component_...', 'methodName': 'method_name', 'args': ['arg1', 'arg2']}",
    schema: z.object({
      componentAddress: z.string().describe("The address of the component"),
      methodName: z.string().describe("The name of the method to call"),
      args: z.array(z.string()).optional().describe("Arguments to pass to the method (as strings)"),
    }),
    func: async (input) => {
      try {
        // Validate input
        if (!input.componentAddress || !input.methodName) {
          return "❌ Invalid input. Please provide both componentAddress and methodName.\nFormat: {'componentAddress': 'component_...', 'methodName': 'method_name', 'args': ['arg1', 'arg2']}";
        }

        const componentAddress = input.componentAddress.trim();
        const methodName = input.methodName.trim();
        const args = input.args || [];

        // Validate component address format
        if (!componentAddress.startsWith("component_")) {
          return `❌ Invalid component address format: ${componentAddress}. Component addresses should start with 'component_'`;
        }

        // Validate method name
        if (!methodName || methodName.length === 0) {
          return "❌ Method name cannot be empty";
        }

        // Get current epoch
        const currentEpoch = await gatewayClient.getCurrentEpoch();

        // Call the component method using the component service
        const txHash = await componentService.callComponentMethod(
          {
            ownerAddress: wallet.getAddress(),
            componentAddress: componentAddress,
            method: methodName,
            args: args,
          },
          wallet,
          currentEpoch
        );

        const componentDisplay = `${componentAddress.slice(0, 20)}...`;
        const argsDisplay = args.length > 0 ? ` with arguments: [${args.join(", ")}]` : " (no arguments)";

        return `✅ **Method Call Successful!**

🔧 **Method**: ${methodName}
🎯 **Component**: ${componentDisplay}
📝 **Arguments**: ${args.length > 0 ? args.join(", ") : "None"}
💰 **From Account**: ${wallet.getAddress().slice(0, 20)}...

🔗 **Transaction**: ${txHash.slice(0, 16)}...

📊 **To see the method results:**
1. Visit: https://stokenet-dashboard.radixdlt.com/
2. Search for the transaction hash above
3. View the "Execution" section for method output

💡 **Note**: For methods like 'get_amount', the return value will be shown in the transaction execution details on the dashboard.`;

      } catch (error) {
        console.error("Error calling component method:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `❌ Failed to call component method: ${errorMessage}`;
      }
    }
  });
}
