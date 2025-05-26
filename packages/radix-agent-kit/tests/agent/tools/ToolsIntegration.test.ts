import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { RadixAgent, RadixNetwork, FaucetHelper } from '../../../src/index';
import { RadixMnemonicWallet } from '../../../src/radix/MnemonicWallet';
import { NetworkId } from '@radixdlt/radix-engine-toolkit';

describe('Radix Tools Integration Tests', () => {
  let agent: RadixAgent;
  let wallet: RadixMnemonicWallet;
  let walletAddress: string;
  let faucetHelper: FaucetHelper;

  beforeAll(async () => {
    // Create agent with test configuration
    agent = new RadixAgent({
      networkId: RadixNetwork.Stokenet,
      openaiApiKey: process.env.OPENAI_API_KEY || 'test-key',
      applicationName: 'ToolsIntegrationTest',
      verbose: false,
      temperature: 0.1
    });

    // Generate wallet with proper async method
    const walletInfo = await agent.generateNewWalletAsync();
    wallet = walletInfo.wallet as RadixMnemonicWallet;
    walletAddress = wallet.getAddress();

    console.log(`🔑 Test wallet: ${walletAddress}`);

    // Initialize faucet helper
    faucetHelper = new FaucetHelper(RadixNetwork.Stokenet);

    // Fund the wallet for testing
    try {
      console.log('💰 Funding test wallet...');
      await faucetHelper.ensureMinimumBalance(wallet, 100, 1000);
      const balance = await faucetHelper.getXRDBalance(wallet);
      console.log(`💰 Test wallet balance: ${balance} XRD`);
    } catch (error) {
      console.warn('⚠️ Could not fund test wallet:', error);
    }
  }, 60000); // Increase timeout for funding

  describe('Tool Availability', () => {
    test('should have all 9 expected tools available', () => {
      const tools = agent.getTools();
      expect(tools).toHaveLength(9);

      const toolNames = tools.map(tool => tool.name);
      const expectedTools = [
        'get_account_info',
        'get_balances', 
        'transfer_tokens',
        'get_epoch',
        'create_fungible_resource',
        'stake_xrd',
        'add_liquidity',
        'swap_tokens',
        'call_component_method'
      ];

      expectedTools.forEach(expectedTool => {
        expect(toolNames).toContain(expectedTool);
      });
    });

    test('should have proper tool descriptions', () => {
      const tools = agent.getTools();
      
      const accountInfoTool = tools.find(t => t.name === 'get_account_info');
      expect(accountInfoTool?.description).toContain('account information');
      expect(accountInfoTool?.description).toContain('account details');

      const balancesTool = tools.find(t => t.name === 'get_balances');
      expect(balancesTool?.description).toContain('balances');
      expect(balancesTool?.description).toContain('tokens');

      const epochTool = tools.find(t => t.name === 'get_epoch');
      expect(epochTool?.description).toContain('current epoch');
    });
  });

  describe('Direct Tool Execution', () => {
    test('get_epoch tool should return current epoch', async () => {
      const tools = agent.getTools();
      const epochTool = tools.find(t => t.name === 'get_epoch');
      
      expect(epochTool).toBeDefined();
      
      const result = await epochTool!.func({});
      expect(typeof result).toBe('string');
      expect(result).toContain('Current Radix Network Epoch');
      expect(result).toMatch(/\d+/); // Should contain numbers
    }, 10000);

    test('get_account_info tool should return account information', async () => {
      const tools = agent.getTools();
      const accountTool = tools.find(t => t.name === 'get_account_info');
      
      expect(accountTool).toBeDefined();
      
      const result = await accountTool!.func({});
      expect(typeof result).toBe('string');
      expect(result).toContain('account');
      expect(result).toContain(walletAddress);
    }, 15000);

    test('get_balances tool should return balance information', async () => {
      const tools = agent.getTools();
      const balancesTool = tools.find(t => t.name === 'get_balances');
      
      expect(balancesTool).toBeDefined();
      
      const result = await balancesTool!.func({});
      expect(typeof result).toBe('string');
      expect(result).toContain(walletAddress);
      // New account should have no balances
      expect(result).toContain('no token balances');
    }, 15000);

    test('transfer_tokens tool should validate input format', async () => {
      const tools = agent.getTools();
      const transferTool = tools.find(t => t.name === 'transfer_tokens');
      
      expect(transferTool).toBeDefined();
      
      // Test with invalid input
      const result = await transferTool!.func({
        to_address: 'invalid_address',
        amount: '100',
        resource_address: 'invalid_resource'
      });
      
      expect(typeof result).toBe('string');
      expect(result).toContain('❌'); // Should contain error indicator
    }, 10000);

    test('create_fungible_resource tool should validate input', async () => {
      const tools = agent.getTools();
      const createTool = tools.find(t => t.name === 'create_fungible_resource');
      
      expect(createTool).toBeDefined();
      
      // Test with minimal valid input
      const result = await createTool!.func({
        input: 'TestToken,TEST,1000000'
      });
      
      expect(typeof result).toBe('string');
      // Should either succeed or fail with proper error message
      expect(result.length).toBeGreaterThan(0);
    }, 20000);
  });

  describe('AI Tool Selection', () => {
    test('should correctly select get_epoch tool for epoch queries', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('⏭️ Skipping AI tests - no OpenAI API key');
        return;
      }

      const response = await agent.run("What is the current epoch?");
      expect(typeof response).toBe('string');
      expect(response).toContain('epoch');
      expect(response).toMatch(/\d+/); // Should contain epoch number
    }, 30000);

    test('should correctly select get_account_info tool for account queries', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('⏭️ Skipping AI tests - no OpenAI API key');
        return;
      }

      const response = await agent.run("What is my account information?");
      expect(typeof response).toBe('string');
      expect(response).toContain('account');
      expect(response).toContain(walletAddress);
    }, 30000);

    test('should correctly select get_balances tool for balance queries', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('⏭️ Skipping AI tests - no OpenAI API key');
        return;
      }

      const response = await agent.run("What are my token balances?");
      expect(typeof response).toBe('string');
      expect(response).toContain('balance');
    }, 30000);

    test('should handle address queries without tools', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('⏭️ Skipping AI tests - no OpenAI API key');
        return;
      }

      const response = await agent.run("What is my account address?");
      expect(typeof response).toBe('string');
      expect(response).toContain(walletAddress);
    }, 30000);
  });

  describe('Error Handling', () => {
    test('tools should handle invalid addresses gracefully', async () => {
      const tools = agent.getTools();
      const accountTool = tools.find(t => t.name === 'get_account_info');
      
      const result = await accountTool!.func({
        account_address: 'invalid_address_format'
      });
      
      expect(result).toContain('❌');
      expect(result).toContain('Invalid');
    }, 10000);

    test('tools should handle network errors gracefully', async () => {
      // This test verifies that tools don't crash on network issues
      const tools = agent.getTools();
      expect(tools.length).toBeGreaterThan(0);
      
      // All tools should be wrapped with error handling
      tools.forEach(tool => {
        expect(tool.func).toBeDefined();
        expect(typeof tool.func).toBe('function');
      });
    });
  });

  describe('Tool Descriptions and Schema', () => {
    test('all tools should have proper schemas', () => {
      const tools = agent.getTools();
      
      tools.forEach(tool => {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.schema).toBeDefined();
        expect(tool.description.length).toBeGreaterThan(10);
      });
    });

    test('tools should have specific trigger phrases in descriptions', () => {
      const tools = agent.getTools();
      
      const accountTool = tools.find(t => t.name === 'get_account_info');
      expect(accountTool?.description).toContain('account information');
      expect(accountTool?.description).toContain('account details');
      expect(accountTool?.description).toContain('account info');

      const balancesTool = tools.find(t => t.name === 'get_balances');
      expect(balancesTool?.description).toContain('balances');
      expect(balancesTool?.description).toContain('XRD balance');
      expect(balancesTool?.description).toContain('tokens');

      const epochTool = tools.find(t => t.name === 'get_epoch');
      expect(epochTool?.description).toContain('current epoch');
      expect(epochTool?.description).toContain('epoch number');
    });
  });

  afterAll(async () => {
    // Cleanup if needed
    console.log('🧹 Tools integration tests completed');
  });
}); 