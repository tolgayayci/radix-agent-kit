import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { RadixGatewayClient } from "../../radix/RadixGatewayClient";
import { RadixTransactionBuilder } from "../../radix/RadixTransactionBuilder";
import { RadixWallet } from "../../radix/RadixWallet";

/**
 * Tool for retrieving account balances from the Radix ledger
 */
export function createGetBalancesTool(
  gatewayClient: RadixGatewayClient,
  transactionBuilder: RadixTransactionBuilder,
  wallet: RadixWallet,
  networkId: number
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "get_balances",
    description: "Use this tool when users ask about 'balances', 'tokens', 'XRD balance', 'how much XRD', 'what tokens do I have', or any balance-related queries. Lists all token balances for an account with formatted amounts and token symbols. Call this for queries like 'what's my balance', 'show my tokens', 'how much XRD do I have', etc.",
    schema: z.object({
      account_address: z.string().optional().describe("Account address to check balances for (optional, defaults to agent's account)")
    }),
    func: async ({ account_address }) => {
      try {
        // Use agent's address if no input provided
        const accountAddress = account_address || wallet.getAddress();
        
        // Validate address format
        if (!accountAddress || !accountAddress.startsWith('account_')) {
          return `❌ Invalid account address format: ${accountAddress}. Expected format: account_...`;
        }

        console.log(`🔍 Fetching balances for account: ${accountAddress}`);

        const response = await gatewayClient.getAccountBalances(accountAddress);
        
        // Extract fungible resources from the response
        if (!response.items || response.items.length === 0) {
          return `📭 Account ${accountAddress} not found or has no balances. This could mean:
• The account doesn't exist on the network
• The account has never received any tokens
• There might be a network connectivity issue

Please verify the account address is correct.`;
        }

        const accountData = response.items[0];
        const fungibleResources = accountData.fungible_resources?.items || [];
        const nonFungibleResources = accountData.non_fungible_resources?.items || [];
        
        if (fungibleResources.length === 0 && nonFungibleResources.length === 0) {
          return `📭 Account ${accountAddress} has no token balances or NFT collections.

This account exists but currently holds no assets. To receive assets, you can:
• Transfer tokens from another account  
• Receive XRD from a faucet (on testnet)
• Participate in token distributions
• Create your own tokens or NFT collections`;
        }

        let result = `💰 ${accountAddress === wallet.getAddress() ? 'Your account' : 'Account'} ${accountAddress} assets:\n\n`;

        // Format fungible token balances
        if (fungibleResources.length > 0) {
          result += `🪙 FUNGIBLE TOKENS:\n`;
          const balanceStrings = fungibleResources.map((resource: any) => {
            // Get amount from vaults.items[0].amount (correct path based on Gateway API)
            const amount = resource.vaults?.items?.[0]?.amount ? parseFloat(resource.vaults.items[0].amount) : 0;
            const formattedAmount = amount.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 6
            });
            
            let symbol = 'Unknown';
            let name = '';
            
            // Try to get symbol and name from metadata
            if (resource.explicit_metadata?.items) {
              const symbolMeta = resource.explicit_metadata.items.find(
                (item: any) => item.key === 'symbol'
              );
              const nameMeta = resource.explicit_metadata.items.find(
                (item: any) => item.key === 'name'
              );
              
              if (symbolMeta?.value?.typed?.type === 'String' && symbolMeta.value.typed.value) {
                symbol = symbolMeta.value.typed.value;
              }
              if (nameMeta?.value?.typed?.type === 'String' && nameMeta.value.typed.value) {
                name = nameMeta.value.typed.value;
              }
            }
            
            // Special case for XRD
            if (resource.resource_address === transactionBuilder.getXRDResourceAddress()) {
              symbol = 'XRD';
              name = 'Radix';
            }
            
            const displayName = name && name !== symbol ? `${name} (${symbol})` : symbol;
            const resourceAddr = resource.resource_address.slice(0, 20) + '...';
            return `  • ${formattedAmount} ${displayName} [${resourceAddr}]`;
          });
          result += balanceStrings.join('\n') + '\n\n';
        }

        // Format NFT collections
        if (nonFungibleResources.length > 0) {
          result += `🎨 NFT COLLECTIONS:\n`;
          const nftStrings = nonFungibleResources.map((resource: any) => {
            const nftCount = resource.vaults?.items?.[0]?.total_count || 0;
            
            let name = 'Unknown Collection';
            
            // Try to get name from metadata
            if (resource.explicit_metadata?.items) {
              const nameMeta = resource.explicit_metadata.items.find(
                (item: any) => item.key === 'name'
              );
              
              if (nameMeta?.value?.typed?.type === 'String' && nameMeta.value.typed.value) {
                name = nameMeta.value.typed.value;
              }
            }
            
            const resourceAddr = resource.resource_address.slice(0, 20) + '...';
            return `  • ${nftCount} NFT${nftCount !== 1 ? 's' : ''} in "${name}" [${resourceAddr}]`;
          });
          result += nftStrings.join('\n') + '\n\n';
        }

        const totalAssets = fungibleResources.length + nonFungibleResources.length;
        result += `📊 Total: ${fungibleResources.length} token type${fungibleResources.length !== 1 ? 's' : ''}, ${nonFungibleResources.length} NFT collection${nonFungibleResources.length !== 1 ? 's' : ''}`;

        return result;

      } catch (error) {
        console.error("GetBalancesTool error:", error);
        
        if (error instanceof Error) {
          if (error.message.includes('404') || error.message.includes('not found')) {
            return `❌ Account ${account_address || wallet.getAddress()} not found on the Radix network. Please verify the account address is correct.`;
          }
          if (error.message.includes('timeout') || error.message.includes('network')) {
            return `🌐 Network timeout while fetching balances. The Radix Gateway might be temporarily unavailable. Please try again in a moment.`;
          }
          if (error.message.includes('rate limit')) {
            return `⏱️ Rate limit exceeded. Please wait a moment before checking balances again.`;
          }
          
          return `❌ Error retrieving balances: ${error.message}`;
        }
        
        return `❌ Unexpected error retrieving balances. Please try again or contact support if the issue persists.`;
      }
    }
  });
}
