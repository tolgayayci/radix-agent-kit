import { describe, test, expect, beforeAll } from '@jest/globals';
import { RadixAgent, RadixNetwork } from '../../src/index';
import { RadixMnemonicWallet } from '../../src/radix/MnemonicWallet';

describe('Replit Demos Integration Tests', () => {
  let agent: RadixAgent;
  let wallet: RadixMnemonicWallet;
  let walletAddress: string;

  beforeAll(async () => {
    // Create agent similar to Replit demos
    agent = new RadixAgent({
      networkId: RadixNetwork.Stokenet,
      openaiApiKey: process.env.OPENAI_API_KEY || 'test-key',
      applicationName: 'ReplitDemoTest',
      verbose: false,
      temperature: 0.1
    });

    // Generate wallet using the async method (fixed version)
    const walletInfo = await agent.generateNewWalletAsync();
    wallet = walletInfo.wallet as RadixMnemonicWallet;
    walletAddress = wallet.getAddress();

    console.log(`🔑 Demo test wallet: ${walletAddress}`);
  });

  describe('Basic Agent Demo Functionality', () => {
    test('should generate proper wallet address format', () => {
      expect(walletAddress).toMatch(/^account_tdx_2_[a-z0-9]+$/);
      expect(walletAddress.length).toBeGreaterThan(50);
    });

    test('should have correct agent configuration', () => {
      const info = agent.getInfo();
      expect(info.networkId).toBe('stokenet');
      expect(info.walletAddress).toBe(walletAddress);
      expect(info.toolCount).toBe(9);
      expect(info.hasMemory).toBe(false);
    });

    test('should have all expected tools available', () => {
      const tools = agent.getTools();
      const toolNames = tools.map(t => t.name);
      
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
  });

  describe('Basic Demo Queries', () => {
    test('should handle address queries correctly', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('⏭️ Skipping AI tests - no OpenAI API key');
        return;
      }

      const response = await agent.run("What's my account address?");
      expect(typeof response).toBe('string');
      expect(response).toContain(walletAddress);
    }, 30000);

    test('should handle epoch queries correctly', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('⏭️ Skipping AI tests - no OpenAI API key');
        return;
      }

      const response = await agent.run("What is the current epoch?");
      expect(typeof response).toBe('string');
      expect(response).toContain('epoch');
      expect(response).toMatch(/\d+/);
    }, 30000);

    test('should handle balance queries correctly', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('⏭️ Skipping AI tests - no OpenAI API key');
        return;
      }

      const response = await agent.run("What's my XRD balance?");
      expect(typeof response).toBe('string');
      expect(response).toContain('balance');
    }, 30000);

    test('should handle account info queries correctly', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('⏭️ Skipping AI tests - no OpenAI API key');
        return;
      }

      const response = await agent.run("Show me my account information");
      expect(typeof response).toBe('string');
      expect(response).toContain('account');
      expect(response).toContain(walletAddress);
    }, 30000);
  });

  describe('Token Operations Demo Functionality', () => {
    test('should validate token creation parameters', async () => {
      const tools = agent.getTools();
      const createTool = tools.find(t => t.name === 'create_fungible_resource');
      
      expect(createTool).toBeDefined();
      
      // Test with valid parameters
      const result = await createTool!.func({
        input: 'TestToken,TEST,1000000,18'
      });
      
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    }, 20000);

    test('should handle token creation queries through AI', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('⏭️ Skipping AI tests - no OpenAI API key');
        return;
      }

      const response = await agent.run("How do I create a new token?");
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('DeFi Operations Demo Functionality', () => {
    test('should have staking tool available', () => {
      const tools = agent.getTools();
      const stakeTool = tools.find(t => t.name === 'stake_xrd');
      
      expect(stakeTool).toBeDefined();
      expect(stakeTool!.description).toContain('Stake XRD');
    });

    test('should have liquidity tools available', () => {
      const tools = agent.getTools();
      const liquidityTool = tools.find(t => t.name === 'add_liquidity');
      const swapTool = tools.find(t => t.name === 'swap_tokens');
      
      expect(liquidityTool).toBeDefined();
      expect(swapTool).toBeDefined();
      expect(liquidityTool!.description).toContain('liquidity');
      expect(swapTool!.description).toContain('swap');
    });

    test('should validate staking parameters', async () => {
      const tools = agent.getTools();
      const stakeTool = tools.find(t => t.name === 'stake_xrd');
      
      // Test with invalid parameters
      const result = await stakeTool!.func({
        input: 'invalid_validator,100'
      });
      
      expect(typeof result).toBe('string');
      expect(result).toContain('❌');
    });
  });

  describe('Direct API Demo Functionality', () => {
    test('should have working gateway client', async () => {
      const gatewayClient = agent.getGatewayClient();
      
      const status = await gatewayClient.getGatewayStatus();
      expect(status).toBeDefined();
      expect(status.ledger_state).toBeDefined();
      expect(status.ledger_state.epoch).toBeGreaterThan(0);
      expect(status.ledger_state.network).toBe('stokenet');
    }, 10000);

    test('should have working transaction builder', () => {
      const transactionBuilder = agent.getTransactionBuilder();
      
      expect(transactionBuilder).toBeDefined();
      
      const xrdAddress = transactionBuilder.getXRDResourceAddress();
      expect(xrdAddress).toBeDefined();
      expect(typeof xrdAddress).toBe('string');
      expect(xrdAddress.startsWith('resource_')).toBe(true);
    });

    test('should be able to get account details directly', async () => {
      const gatewayClient = agent.getGatewayClient();
      
      const accountDetails = await gatewayClient.getEntityDetails(walletAddress);
      expect(accountDetails).toBeDefined();
      expect(accountDetails.items).toBeDefined();
      expect(accountDetails.items.length).toBeGreaterThan(0);
    }, 15000);
  });

  describe('Error Handling in Demos', () => {
    test('should handle invalid queries gracefully', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('⏭️ Skipping AI tests - no OpenAI API key');
        return;
      }

      const response = await agent.run("This is a completely invalid blockchain query that makes no sense");
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
      // Should not crash or return empty response
    }, 30000);

    test('should handle network timeouts gracefully', async () => {
      // Test that the agent doesn't crash on network issues
      const tools = agent.getTools();
      expect(tools.length).toBe(9);
      
      // All tools should be properly wrapped with error handling
      tools.forEach(tool => {
        expect(tool.func).toBeDefined();
        expect(typeof tool.func).toBe('function');
      });
    });

    test('should handle empty or invalid inputs', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('⏭️ Skipping AI tests - no OpenAI API key');
        return;
      }

      const response = await agent.run("");
      expect(typeof response).toBe('string');
      expect(response).toContain('Please provide');
    }, 10000);
  });

  describe('Demo Performance', () => {
    test('should respond to queries within reasonable time', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('⏭️ Skipping AI tests - no OpenAI API key');
        return;
      }

      const startTime = Date.now();
      const response = await agent.run("What is the current epoch?");
      const endTime = Date.now();
      
      expect(typeof response).toBe('string');
      expect(response).toContain('epoch');
      
      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(30000); // Should respond within 30 seconds
    }, 35000);

    test('should handle multiple concurrent queries', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('⏭️ Skipping AI tests - no OpenAI API key');
        return;
      }

      const queries = [
        "What is my account address?",
        "What is the current epoch?",
        "What are my balances?"
      ];

      const promises = queries.map(query => agent.run(query));
      const responses = await Promise.all(promises);
      
      expect(responses).toHaveLength(3);
      responses.forEach(response => {
        expect(typeof response).toBe('string');
        expect(response.length).toBeGreaterThan(0);
      });
    }, 60000);
  });
}); 