import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { RadixGatewayClient } from "../../radix/RadixGatewayClient";
import { RadixTransactionBuilder } from "../../radix/RadixTransactionBuilder";
import { RadixWallet } from "../../radix/RadixWallet";

/**
 * Tool for getting the state of a Radix component
 */
export function createGetComponentStateTool(
  gatewayClient: RadixGatewayClient,
  transactionBuilder: RadixTransactionBuilder,
  wallet: RadixWallet,
  networkId: number
) {
  return new DynamicStructuredTool({
    name: "get_component_state",
    description: "Get the current state of a Radix component. Input: component address (e.g., 'component_tdx_2_1c...')",
    schema: z.object({
      componentAddress: z.string().describe("The address of the component to get state for"),
    }),
    func: async (input) => {
      try {
        // Validate input
        if (!input.componentAddress || input.componentAddress.trim().length === 0) {
          return "❌ Invalid input. Please provide a component address.\nFormat: 'component_tdx_2_...' for Stokenet or 'component_rdx...' for Mainnet";
        }

        const componentAddress = input.componentAddress.trim();

        // Validate component address format
        if (!componentAddress.startsWith("component_")) {
          return `❌ Invalid component address format: ${componentAddress}. Component addresses should start with 'component_'`;
        }

        // Get component details from the gateway
        const componentDetails = await gatewayClient.getEntityDetails(
          componentAddress,
          {
            opt_ins: {
              explicit_metadata: ["name", "symbol", "description", "icon_url"],
              ancestor_identities: true,
              component_royalty_config: true,
              component_royalty_vault_balance: true,
              package_royalty_vault_balance: true,
              non_fungible_include_nfids: true,
            },
          }
        );

        // Extract and format the component state
        if (componentDetails.items && componentDetails.items.length > 0) {
          const componentData = componentDetails.items[0];
          const details = componentData.details as any;

          const result = {
            address: componentAddress,
            type: componentData.details?.type || "Unknown",
            state: details?.state || {},
            metadata: componentData.metadata || {},
            roleAssignments: details?.role_assignments || {},
            royalty: details?.royalty || {},
          };

          // Format the response for user display
          let response = `🔍 Component State for ${componentAddress.slice(0, 20)}...\n\n`;
          response += `📋 **Type**: ${result.type}\n`;

          // Display metadata if available
          if (result.metadata && Object.keys(result.metadata).length > 0) {
            response += `\n📝 **Metadata**:\n`;
            for (const [key, value] of Object.entries(result.metadata)) {
              if (typeof value === 'object' && value !== null) {
                response += `  • ${key}: ${JSON.stringify(value, null, 2)}\n`;
              } else {
                response += `  • ${key}: ${value}\n`;
              }
            }
          }

          // Display state if available
          if (result.state && Object.keys(result.state).length > 0) {
            response += `\n🏗️ **Component State**:\n`;
            const stateStr = JSON.stringify(result.state, null, 2);
            if (stateStr.length > 1000) {
              response += `${stateStr.slice(0, 1000)}...\n(State truncated for display)`;
            } else {
              response += stateStr;
            }
          } else {
            response += `\n🏗️ **Component State**: No state data available or component has no public state`;
          }

          // Display role assignments if available
          if (result.roleAssignments && Object.keys(result.roleAssignments).length > 0) {
            response += `\n🔐 **Role Assignments**: Available (${Object.keys(result.roleAssignments).length} roles)`;
          }

          // Display royalty info if available
          if (result.royalty && Object.keys(result.royalty).length > 0) {
            response += `\n💰 **Royalty Config**: Available`;
          }

          return response;
        } else {
          return `❌ Component ${componentAddress} not found or is not accessible. Please verify the component address is correct and the component exists on the current network.`;
        }
      } catch (error) {
        console.error("Error getting component state:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (errorMessage.includes("not found") || errorMessage.includes("404")) {
          return `❌ Component not found: ${input.componentAddress}. Please verify the component address exists on the current network.`;
        }
        if (errorMessage.includes("network") || errorMessage.includes("connection")) {
          return `❌ Network error while fetching component state: ${errorMessage}. Please try again in a moment.`;
        }
        
        return `❌ Failed to get component state: ${errorMessage}`;
      }
    }
  });
} 