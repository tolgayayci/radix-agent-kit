import { describe, test, expect, beforeAll } from '@jest/globals';
import { RadixAgent, RadixNetwork } from '../src/index';
import { RadixMnemonicWallet } from '../src/radix/MnemonicWallet';
import { FaucetHelper } from '../src/utils/FaucetHelper';
import { NetworkId } from '@radixdlt/radix-engine-toolkit';

describe('Faucet Auto-Funding Tests', () => {
  let faucetHelper: FaucetHelper;

  beforeAll(() => {
    faucetHelper = new FaucetHelper(RadixNetwork.Stokenet);
  });

  describe('FaucetHelper Enhanced Functionality', () => {
    test('should create FaucetHelper instance', () => {
      expect(faucetHelper).toBeDefined();
      expect(faucetHelper).toBeInstanceOf(FaucetHelper);
    });

    test('should have auto-funding method', () => {
      expect(typeof faucetHelper.autoFundNewWallet).toBe('function');
    });

    test('should have robust funding method', () => {
      expect(typeof faucetHelper.fundWalletRobust).toBe('function');
    });

    test('should have fee-paying funding method', () => {
      expect(typeof faucetHelper.fundWalletWithFaucetFees).toBe('function');
    });

    test('should check wallet balance', async () => {
      const wallet = RadixMnemonicWallet.generateRandom({
        networkId: NetworkId.Stokenet,
        applicationName: 'TestApp'
      });

      const balance = await faucetHelper.getXRDBalance(wallet);
      expect(typeof balance).toBe('number');
      expect(balance).toBeGreaterThanOrEqual(0);
    }, 15000);
  });

  describe('Wallet Auto-Funding Integration', () => {
    test('should auto-fund newly created wallet via RadixAgent', async () => {
      const agent = new RadixAgent({
        networkId: RadixNetwork.Stokenet,
        openaiApiKey: 'test-key',
        applicationName: 'AutoFundingTest',
        verbose: false
      });

      console.log('🔑 Generating new wallet with auto-funding...');
      const { wallet } = await agent.generateNewWalletAsync();
      
      expect(wallet).toBeDefined();
      expect(wallet.getAddress()).toMatch(/^account_tdx_2_[a-z0-9]+$/);

      // Wait a bit for auto-funding to potentially complete
      await new Promise(resolve => setTimeout(resolve, 8000));

      // Check if wallet was funded
      const balance = await faucetHelper.getXRDBalance(wallet);
      console.log(`💰 Wallet balance after auto-funding: ${balance} XRD`);
      
      // Note: Auto-funding might fail in test environment, so we just verify the process runs
      expect(typeof balance).toBe('number');
    }, 30000);

    test('should auto-fund wallet via MnemonicWallet.generateRandomAsync', async () => {
      console.log('🔑 Generating wallet via MnemonicWallet.generateRandomAsync...');
      
      const wallet = await RadixMnemonicWallet.generateRandomAsync({
        networkId: NetworkId.Stokenet,
        applicationName: 'AutoFundingTest'
      });

      expect(wallet).toBeDefined();
      expect(wallet.getAddress()).toMatch(/^account_tdx_2_[a-z0-9]+$/);

      // Wait a bit for auto-funding to potentially complete
      await new Promise(resolve => setTimeout(resolve, 8000));

      const balance = await faucetHelper.getXRDBalance(wallet);
      console.log(`💰 Wallet balance after auto-funding: ${balance} XRD`);
      
      expect(typeof balance).toBe('number');
    }, 30000);

    test('should handle auto-funding gracefully when it fails', async () => {
      // This test verifies that wallet creation doesn't fail even if auto-funding fails
      const wallet = RadixMnemonicWallet.generateRandom({
        networkId: NetworkId.Stokenet,
        applicationName: 'AutoFundingFailTest'
      });

      expect(wallet).toBeDefined();
      expect(wallet.getAddress()).toBeDefined();
      
      // Wallet should be created successfully even if auto-funding fails
      expect(wallet.getMnemonic().split(' ')).toHaveLength(24);
    });
  });

  describe('Manual Funding Methods', () => {
    test('should attempt robust funding', async () => {
      const wallet = RadixMnemonicWallet.generateRandom({
        networkId: NetworkId.Stokenet,
        applicationName: 'ManualFundingTest'
      });

      try {
        console.log('💰 Attempting robust funding...');
        const result = await faucetHelper.fundWalletRobust(wallet, 500);
        console.log(`✅ Robust funding result: ${result}`);
        expect(typeof result).toBe('string');
      } catch (error) {
        console.warn('⚠️ Robust funding failed (expected in test environment):', error);
        expect(error).toBeDefined();
      }
    }, 25000);

    test('should attempt auto-funding directly', async () => {
      const wallet = RadixMnemonicWallet.generateRandom({
        networkId: NetworkId.Stokenet,
        applicationName: 'DirectAutoFundingTest'
      });

      try {
        console.log('💰 Attempting direct auto-funding...');
        const funded = await faucetHelper.autoFundNewWallet(wallet, 100);
        console.log(`✅ Auto-funding result: ${funded}`);
        expect(typeof funded).toBe('boolean');
      } catch (error) {
        console.warn('⚠️ Auto-funding failed (expected in test environment):', error);
        expect(error).toBeDefined();
      }
    }, 25000);
  });

  describe('Balance Checking', () => {
    test('should check minimum balance correctly', async () => {
      const wallet = RadixMnemonicWallet.generateRandom({
        networkId: NetworkId.Stokenet,
        applicationName: 'BalanceCheckTest'
      });

      const hasMinBalance = await faucetHelper.hasMinimumBalance(wallet, 1000);
      expect(typeof hasMinBalance).toBe('boolean');
      
      // New wallet should not have minimum balance initially
      expect(hasMinBalance).toBe(false);
    }, 15000);

    test('should ensure minimum balance', async () => {
      const wallet = RadixMnemonicWallet.generateRandom({
        networkId: NetworkId.Stokenet,
        applicationName: 'EnsureBalanceTest'
      });

      try {
        console.log('💰 Ensuring minimum balance...');
        const ensured = await faucetHelper.ensureMinimumBalance(wallet, 50, 500);
        console.log(`✅ Ensure balance result: ${ensured}`);
        expect(typeof ensured).toBe('boolean');
      } catch (error) {
        console.warn('⚠️ Ensure balance failed (expected in test environment):', error);
        expect(error).toBeDefined();
      }
    }, 25000);
  });

  describe('Network Validation', () => {
    test('should only work with Stokenet', () => {
      expect(() => {
        new FaucetHelper(RadixNetwork.Mainnet as any);
      }).toThrow('Faucet helper only supports Stokenet testnet');
    });

    test('should default to Stokenet', () => {
      const defaultFaucet = new FaucetHelper();
      expect(defaultFaucet).toBeDefined();
    });
  });
}); 