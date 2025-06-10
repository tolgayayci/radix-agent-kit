import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { RadixGatewayClient, RadixNetwork } from "../../radix/RadixGatewayClient";
import { RadixTransactionBuilder } from "../../radix/RadixTransactionBuilder";
import { RadixWallet } from "../../radix/RadixWallet";
import { FaucetHelper } from "../../utils/FaucetHelper";

/**
 * Tool for funding Stokenet wallets with testnet XRD
 */
export function createFundStokenetWalletTool(
  gatewayClient: RadixGatewayClient,
  transactionBuilder: RadixTransactionBuilder,
  wallet: RadixWallet,
  networkId: number
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "fund_stokenet_wallet",
    description: "Fund the current wallet with testnet XRD from the Stokenet faucet. ONLY use this tool when users EXPLICITLY ask to 'fund my wallet', 'get testnet XRD', 'add money to wallet', 'request funds', or similar funding requests. DO NOT use for balance checking or other queries. Only works on Stokenet testnet.",
    schema: z.object({
      amount: z.string().optional().describe("Target amount to request (optional, defaults to 10000 XRD)")
    }),
    func: async ({ amount }) => {
      try {
        // Only allow on Stokenet
        if (networkId !== 2) { // NetworkId.Stokenet = 2
          return "❌ Wallet funding is only available on Stokenet testnet. Current network does not support faucet funding.";
        }

        const walletAddress = wallet.getAddress();
        
        // Validate address format
        if (!walletAddress || walletAddress.includes('pending') || !walletAddress.startsWith('account_tdx_')) {
          return "❌ Invalid wallet address. Please ensure your wallet is properly initialized.";
        }

        console.log(`💰 Requesting testnet XRD from Stokenet faucet...`);
        
        // Check current balance first
        const faucetHelper = new FaucetHelper(RadixNetwork.Stokenet);
        const currentBalance = await faucetHelper.getXRDBalance(wallet);
        
        // User explicitly requested funding, so proceed regardless of current balance
        console.log(`💰 Current balance: ${currentBalance.toLocaleString()} XRD`);
        console.log(`🚀 Attempting to fund wallet as requested...`);

        // Attempt funding
        let fundingSuccessful = false;
        let errorMessage = '';
        let fundingMethod = '';
        
        try {
          const result = await faucetHelper.forceFundWallet(wallet);
          fundingSuccessful = result.success;
          fundingMethod = result.method;
          if (!result.success) {
            errorMessage = result.error || 'Unknown funding error';
          }
        } catch (error) {
          errorMessage = error instanceof Error ? error.message : String(error);
          console.warn('Force funding failed:', error);
        }

        if (fundingSuccessful) {
          // Wait for funding to appear
          console.log('⏳ Waiting for funding to appear on network...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          // Check new balance
          const newBalance = await faucetHelper.getXRDBalance(wallet);
          
          if (newBalance > currentBalance) {
            const receivedAmount = newBalance - currentBalance;
            return `✅ Funding successful via ${fundingMethod}! 
            
• Previous balance: ${currentBalance.toLocaleString()} XRD
• New balance: ${newBalance.toLocaleString()} XRD  
• Received: ${receivedAmount.toLocaleString()} XRD

Your wallet has been funded as requested! You can check your balance anytime by asking "What's my balance?"`;
          } else if (newBalance >= currentBalance) {
            return `✅ Funding request completed via ${fundingMethod}!

• Current balance: ${newBalance.toLocaleString()} XRD
• Funding method: ${fundingMethod}
• Status: Request processed successfully

Your wallet is ready for transactions! You can check your balance anytime by asking "What's my balance?"`;
          } else {
            return `⏳ Funding request submitted, but balance hasn't updated yet. This can take a few minutes.

Current balance: ${newBalance.toLocaleString()} XRD

If funding doesn't appear soon, try:
• Waiting a few more minutes and checking balance again
• Visiting the Stokenet Dashboard: https://stokenet-dashboard.radixdlt.com/account/${walletAddress}
• Using the manual faucet if available`;
          }
        } else {
          return `⚠️ Funding attempt failed:

• Method tried: ${fundingMethod}
• Current balance: ${currentBalance.toLocaleString()} XRD
• Your address: ${walletAddress}
• Error: ${errorMessage}

Please try manual funding:
• Visit: https://stokenet-dashboard.radixdlt.com/account/${walletAddress}

You can also try asking me to fund your wallet again in a few minutes.`;
        }

      } catch (error) {
        console.error("Error funding wallet:", error);
        
        const walletAddress = wallet.getAddress();
        return `❌ Failed to fund wallet: ${error instanceof Error ? error.message : String(error)}

Please try manual funding:
• Visit: https://stokenet-dashboard.radixdlt.com/account/${walletAddress}
• Your address: ${walletAddress}

You can also try asking me to fund your wallet again later.`;
      }
    }
  });
} 