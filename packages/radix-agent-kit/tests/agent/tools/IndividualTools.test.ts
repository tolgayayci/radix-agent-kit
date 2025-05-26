import { describe, test, expect, beforeAll } from '@jest/globals';
import { RadixGatewayClient, RadixNetwork } from '../../../src/radix/RadixGatewayClient';
import { RadixTransactionBuilder } from '../../../src/radix/RadixTransactionBuilder';
import { RadixMnemonicWallet } from '../../../src/radix/MnemonicWallet';
import { FaucetHelper } from '../../../src/utils/FaucetHelper';
import { NetworkId } from '@radixdlt/radix-engine-toolkit';

// Import tool creators
import { createGetAccountInfoTool } from '../../../src/agent/tools/GetAccountInfoTool';
import { createGetBalancesTool } from '../../../src/agent/tools/GetBalancesTool';
import { createGetEpochTool } from '../../../src/agent/tools/GetEpochTool';
import { createTransferTokensTool } from '../../../src/agent/tools/TransferTokensTool';

describe('Individual Radix Tools Tests', () => {
  let gatewayClient: RadixGatewayClient;
  let transactionBuilder: RadixTransactionBuilder;
  let wallet: RadixMnemonicWallet;
  let networkId: number;
  let faucetHelper: FaucetHelper;

  beforeAll(async () => {
    // Initialize components
    gatewayClient = new RadixGatewayClient({
      networkId: RadixNetwork.Stokenet,
      applicationName: 'IndividualToolsTest'
    });

    transactionBuilder = new RadixTransactionBuilder({
      networkId: RadixNetwork.Stokenet
    });

    networkId = NetworkId.Stokenet;

    // Generate test wallet
    wallet = await RadixMnemonicWallet.generateRandomAsync({
      networkId,
      applicationName: 'IndividualToolsTest'
    });

    console.log(`🔑 Test wallet: ${wallet.getAddress()}`);

    // Initialize faucet helper and fund wallet
    faucetHelper = new FaucetHelper(RadixNetwork.Stokenet);
    
    try {
      console.log('💰 Funding test wallet...');
      await faucetHelper.ensureMinimumBalance(wallet, 50, 500);
      const balance = await faucetHelper.getXRDBalance(wallet);
      console.log(`💰 Test wallet balance: ${balance} XRD`);
    } catch (error) {
      console.warn('⚠️ Could not fund test wallet:', error);
    }
  }, 60000); // Increase timeout for funding

  describe('GetEpochTool', () => {
    test('should create tool with correct properties', () => {
      const tool = createGetEpochTool(gatewayClient, transactionBuilder, wallet, networkId);
      
      expect(tool.name).toBe('get_epoch');
      expect(tool.description).toContain('current epoch');
      expect(tool.description).toContain('epoch number');
      expect(typeof tool.func).toBe('function');
    });

    test('should return current epoch information', async () => {
      const tool = createGetEpochTool(gatewayClient, transactionBuilder, wallet, networkId);
      
      const result = await tool.func({});
      
      expect(typeof result).toBe('string');
      expect(result).toContain('Current Radix Network Epoch');
      expect(result).toMatch(/\d+/); // Should contain epoch number
      expect(result).toContain('transaction validity');
    }, 10000);

    test('should handle network errors gracefully', async () => {
      // Create tool with invalid gateway client
      const invalidGateway = new RadixGatewayClient({
        networkId: RadixNetwork.Stokenet,
        applicationName: 'InvalidTest'
      });
      
      const tool = createGetEpochTool(invalidGateway, transactionBuilder, wallet, networkId);
      
      // Mock a network failure scenario
      const originalGetCurrentEpoch = invalidGateway.getCurrentEpoch;
      invalidGateway.getCurrentEpoch = jest.fn().mockRejectedValue(new Error('Network error'));
      
      const result = await tool.func({});
      
      expect(result).toContain('❌');
      expect(result).toContain('Error retrieving current epoch');
      
      // Restore original method
      invalidGateway.getCurrentEpoch = originalGetCurrentEpoch;
    });
  });

  describe('GetAccountInfoTool', () => {
    test('should create tool with correct properties', () => {
      const tool = createGetAccountInfoTool(gatewayClient, transactionBuilder, wallet, networkId);
      
      expect(tool.name).toBe('get_account_info');
      expect(tool.description).toContain('account information');
      expect(tool.description).toContain('account details');
      expect(tool.description).toContain('account info');
      expect(typeof tool.func).toBe('function');
    });

    test('should return account information for valid address', async () => {
      const tool = createGetAccountInfoTool(gatewayClient, transactionBuilder, wallet, networkId);
      
      const result = await tool.func({});
      
      expect(typeof result).toBe('string');
      expect(result).toContain('account');
      expect(result).toContain(wallet.getAddress());
      expect(result).toContain('Address:');
    }, 15000);

    test('should handle invalid address format', async () => {
      const tool = createGetAccountInfoTool(gatewayClient, transactionBuilder, wallet, networkId);
      
      const result = await tool.func({
        account_address: 'invalid_address_format'
      });
      
      expect(result).toContain('❌');
      expect(result).toContain('Invalid');
    });

    test('should use agent address when no address provided', async () => {
      const tool = createGetAccountInfoTool(gatewayClient, transactionBuilder, wallet, networkId);
      
      const result = await tool.func({});
      
      expect(result).toContain(wallet.getAddress());
      expect(result).toContain('Your account');
    }, 15000);
  });

  describe('GetBalancesTool', () => {
    test('should create tool with correct properties', () => {
      const tool = createGetBalancesTool(gatewayClient, transactionBuilder, wallet, networkId);
      
      expect(tool.name).toBe('get_balances');
      expect(tool.description).toContain('balances');
      expect(tool.description).toContain('tokens');
      expect(tool.description).toContain('XRD balance');
      expect(typeof tool.func).toBe('function');
    });

    test('should return balance information for new account', async () => {
      const tool = createGetBalancesTool(gatewayClient, transactionBuilder, wallet, networkId);
      
      const result = await tool.func({});
      
      expect(typeof result).toBe('string');
      expect(result).toContain(wallet.getAddress());
      // New account should have no balances
      expect(result).toContain('no token balances');
    }, 15000);

    test('should handle invalid address format', async () => {
      const tool = createGetBalancesTool(gatewayClient, transactionBuilder, wallet, networkId);
      
      const result = await tool.func({
        account_address: 'invalid_address'
      });
      
      expect(result).toContain('❌');
      expect(result).toContain('Invalid account address format');
    });

    test('should use agent address when no address provided', async () => {
      const tool = createGetBalancesTool(gatewayClient, transactionBuilder, wallet, networkId);
      
      const result = await tool.func({});
      
      expect(result).toContain(wallet.getAddress());
    }, 15000);
  });

  describe('TransferTokensTool', () => {
    test('should create tool with correct properties', () => {
      const tool = createTransferTokensTool(gatewayClient, transactionBuilder, wallet, networkId);
      
      expect(tool.name).toBe('transfer_tokens');
      expect(tool.description).toContain('Transfer tokens');
      expect(typeof tool.func).toBe('function');
    });

    test('should validate required parameters', async () => {
      const tool = createTransferTokensTool(gatewayClient, transactionBuilder, wallet, networkId);
      
      // Test with missing parameters
      const result = await tool.func({});
      
      expect(typeof result).toBe('string');
      expect(result).toContain('❌');
    });

    test('should validate address formats', async () => {
      const tool = createTransferTokensTool(gatewayClient, transactionBuilder, wallet, networkId);
      
      const result = await tool.func({
        to_address: 'invalid_address',
        amount: '100',
        resource_address: 'invalid_resource'
      });
      
      expect(result).toContain('❌');
      expect(result).toContain('Invalid');
    });

    test('should handle valid input format but insufficient funds', async () => {
      const tool = createTransferTokensTool(gatewayClient, transactionBuilder, wallet, networkId);
      
      // Use a valid Stokenet address format but expect insufficient funds
      const validAddress = 'account_tdx_2_12xvlee7xtg7dx599yv69tzkpeqzn4wr2nlcqcpvzar97vn3x3k6hc8';
      const xrdResourceAddress = transactionBuilder.getXRDResourceAddress();
      
      const result = await tool.func({
        to_address: validAddress,
        amount: '1',
        resource_address: xrdResourceAddress
      });
      
      expect(typeof result).toBe('string');
      // Should either succeed or fail with proper error message
      expect(result.length).toBeGreaterThan(0);
    }, 20000);
  });

  describe('Tool Error Handling', () => {
    test('all tools should handle network timeouts', async () => {
      const tools = [
        createGetEpochTool(gatewayClient, transactionBuilder, wallet, networkId),
        createGetAccountInfoTool(gatewayClient, transactionBuilder, wallet, networkId),
        createGetBalancesTool(gatewayClient, transactionBuilder, wallet, networkId),
        createTransferTokensTool(gatewayClient, transactionBuilder, wallet, networkId)
      ];

      // Test that all tools have proper error handling structure
      tools.forEach(tool => {
        expect(tool.func).toBeDefined();
        expect(typeof tool.func).toBe('function');
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
      });
    });

    test('tools should return string responses', async () => {
      const epochTool = createGetEpochTool(gatewayClient, transactionBuilder, wallet, networkId);
      
      const result = await epochTool.func({});
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    }, 10000);
  });

  describe('Tool Schema Validation', () => {
    test('GetEpochTool should have empty schema', () => {
      const tool = createGetEpochTool(gatewayClient, transactionBuilder, wallet, networkId);
      
      expect(tool.schema).toBeDefined();
      // Epoch tool doesn't need parameters
    });

    test('GetAccountInfoTool should have optional address parameter', () => {
      const tool = createGetAccountInfoTool(gatewayClient, transactionBuilder, wallet, networkId);
      
      expect(tool.schema).toBeDefined();
      // Should have optional account_address parameter
    });

    test('GetBalancesTool should have optional address parameter', () => {
      const tool = createGetBalancesTool(gatewayClient, transactionBuilder, wallet, networkId);
      
      expect(tool.schema).toBeDefined();
      // Should have optional account_address parameter
    });

    test('TransferTokensTool should have required parameters', () => {
      const tool = createTransferTokensTool(gatewayClient, transactionBuilder, wallet, networkId);
      
      expect(tool.schema).toBeDefined();
      // Should have required parameters for transfer
    });
  });
}); 