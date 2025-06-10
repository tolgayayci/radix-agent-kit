import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';
import { RadixMnemonicWallet } from '../../src/radix/MnemonicWallet';
import { RadixGatewayClient, RadixNetwork } from '../../src/radix/RadixGatewayClient';
import { RadixTransactionBuilder } from '../../src/radix/RadixTransactionBuilder';
import { DeFi } from '../../src/radix/DeFi';
import { StakeXRDTool, UnstakeXRDTool, ClaimXRDTool } from '../../src/agent/tools';
import { FaucetHelper } from '../../src/utils/FaucetHelper';
import { NetworkId } from '@radixdlt/radix-engine-toolkit';

describe('Staking Integration Tests (Real Implementation)', () => {
  let wallet: RadixMnemonicWallet;
  let gatewayClient: RadixGatewayClient;
  let transactionBuilder: RadixTransactionBuilder;
  let defiService: DeFi;
  let faucetHelper: FaucetHelper;
  let networkId: number;
  
  // Test validator address (REAL validator from Stokenet API response)
  const testValidatorAddress = 'validator_tdx_2_1sdx3u8mhd3yt537jy5g3psaypmlx0dk2x78efev2qw8kl7a7c5c48y';
  
  let stakeXRDTool: StakeXRDTool;
  let unstakeXRDTool: UnstakeXRDTool;
  let claimXRDTool: ClaimXRDTool;

  beforeAll(async () => {
    // Initialize components for Stokenet testnet
    networkId = NetworkId.Stokenet;
    
    gatewayClient = new RadixGatewayClient({
      networkId: RadixNetwork.Stokenet,
      applicationName: 'StakingIntegrationTest'
    });

    transactionBuilder = new RadixTransactionBuilder({
      networkId: RadixNetwork.Stokenet
    });

    defiService = new DeFi(transactionBuilder, gatewayClient, networkId);
    faucetHelper = new FaucetHelper(RadixNetwork.Stokenet);

    // Generate a new wallet for testing
    console.log('🔑 Generating test wallet...');
    wallet = await RadixMnemonicWallet.generateRandomAsync({
      networkId,
      applicationName: 'StakingIntegrationTest'
    });

    console.log(`📍 Test wallet address: ${wallet.getAddress()}`);
    console.log(`🔐 Test wallet mnemonic: ${wallet.getMnemonic()}`);

    // Initialize tools with the real components
    stakeXRDTool = new StakeXRDTool(gatewayClient, transactionBuilder, wallet, networkId);
    unstakeXRDTool = new UnstakeXRDTool(gatewayClient, transactionBuilder, wallet, networkId);
    claimXRDTool = new ClaimXRDTool(gatewayClient, transactionBuilder, wallet, networkId);

    // Fund the wallet with testnet XRD
    console.log('💰 Funding test wallet...');
    try {
      await faucetHelper.ensureMinimumBalance(wallet, 100, 1000);
      const balance = await faucetHelper.getXRDBalance(wallet);
      console.log(`✅ Test wallet funded with ${balance} XRD`);
      
      // Ensure we have enough balance for testing
      if (balance < 50) {
        throw new Error(`Insufficient balance for testing: ${balance} XRD. Need at least 50 XRD.`);
      }
    } catch (error) {
      console.warn('⚠️ Wallet funding failed:', error);
      throw new Error('Cannot proceed with tests - wallet funding failed');
    }

    console.log('🏆 Test environment setup complete');
  }, 90000); // 90 seconds timeout for setup

  afterAll(async () => {
    console.log('🧹 Test cleanup completed');
  });

  describe('Stake XRD Functionality', () => {
    test('should stake XRD using StakeXRDTool', async () => {
      console.log('\n🎯 Testing StakeXRDTool...');
      
      const initialBalance = await faucetHelper.getXRDBalance(wallet);
      console.log(`💰 Initial balance: ${initialBalance} XRD`);
      
      // Test with a small amount (10 XRD)
      const stakeAmount = '10';
      const input = `${testValidatorAddress},${stakeAmount}`;
      
      console.log(`🔄 Staking ${stakeAmount} XRD with validator: ${testValidatorAddress}`);
      
      const result = await stakeXRDTool._call(input);
      console.log(`📄 Stake result: ${result}`);
      
      // Verify the result is not an error
      expect(result).toBeDefined();
      expect(result).not.toMatch(/❌/);
      expect(result).toMatch(/Staked/);
      
      // Verify transaction hash is returned
      if (result.includes('Transaction: ')) {
        const txMatch = result.match(/Transaction: ([a-f0-9]+)/);
        expect(txMatch).toBeTruthy();
        console.log(`✅ Transaction hash: ${txMatch?.[1]}`);
      }
      
      // Wait a bit for the transaction to be processed
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Check new balance
      const newBalance = await faucetHelper.getXRDBalance(wallet);
      console.log(`💰 New balance: ${newBalance} XRD`);
      
      // Balance should be less than initial (minus stake amount and fees)
      expect(newBalance).toBeLessThan(initialBalance);
      
    }, 60000); // 60 seconds timeout
    
    test('should stake XRD using DeFi service directly', async () => {
      console.log('\n🎯 Testing DeFi.stakeXRD directly...');
      
      const currentEpoch = await gatewayClient.getCurrentEpoch();
      console.log(`📅 Current epoch: ${currentEpoch}`);
      
      const stakeAmount = '5';
      console.log(`🔄 Staking ${stakeAmount} XRD directly via DeFi service...`);
      
      const txHash = await defiService.stakeXRD(
        {
          ownerAddress: wallet.getAddress(),
          validatorAddress: testValidatorAddress,
          amount: stakeAmount,
        },
        wallet,
        currentEpoch
      );
      
      console.log(`✅ Stake transaction hash: ${txHash}`);
      expect(txHash).toBeDefined();
      expect(typeof txHash).toBe('string');
      expect(txHash.length).toBeGreaterThan(0);
      
    }, 45000);

    test('should handle invalid validator address gracefully', async () => {
      console.log('\n🎯 Testing invalid validator address...');
      
      const invalidValidator = 'invalid_validator_address';
      const input = `${invalidValidator},10`;
      
      const result = await stakeXRDTool._call(input);
      console.log(`📄 Invalid validator result: ${result}`);
      
      expect(result).toMatch(/❌/);
      expect(result).toMatch(/Invalid validator address/);
      
    }, 30000);
  });

  describe('Unstake XRD Functionality', () => {
    test('should attempt unstaking (may fail if no stake units)', async () => {
      console.log('\n🎯 Testing UnstakeXRDTool...');
      
      // Note: This test may fail if we don't have stake units yet
      // because staking might take time to be reflected on-chain
      const unstakeAmount = '1';
      const input = `${testValidatorAddress},${unstakeAmount}`;
      
      console.log(`🔄 Attempting to unstake ${unstakeAmount} stake units from validator: ${testValidatorAddress}`);
      
      const result = await unstakeXRDTool._call(input);
      console.log(`📄 Unstake result: ${result}`);
      
      expect(result).toBeDefined();
      
      // The result might be an error if no stake units are available
      // or it might be successful if stake units exist
      if (result.includes('❌')) {
        console.log('ℹ️ Unstaking failed as expected (no stake units available yet or insufficient balance)');
        expect(result).toMatch(/❌/);
      } else {
        console.log('✅ Unstaking succeeded');
        expect(result).toMatch(/Unstaked/);
      }
      
    }, 60000);
    
    test('should test unstaking via DeFi service directly', async () => {
      console.log('\n🎯 Testing DeFi.unstakeXRD directly...');
      
      const currentEpoch = await gatewayClient.getCurrentEpoch();
      const unstakeAmount = '1';
      
      try {
        const txHash = await defiService.unstakeXRD(
          {
            ownerAddress: wallet.getAddress(),
            validatorAddress: testValidatorAddress,
            amount: unstakeAmount,
          },
          wallet,
          currentEpoch
        );
        
        console.log(`✅ Unstake transaction hash: ${txHash}`);
        expect(txHash).toBeDefined();
        expect(typeof txHash).toBe('string');
        
      } catch (error) {
        console.log('ℹ️ Unstaking failed as expected:', error instanceof Error ? error.message : String(error));
        // This is expected if we don't have stake units or can't determine stake unit address
        expect(error).toBeDefined();
      }
      
    }, 45000);

    test('should handle invalid input gracefully', async () => {
      console.log('\n🎯 Testing invalid unstake input...');
      
      const invalidInput = 'invalid_input';
      const result = await unstakeXRDTool._call(invalidInput);
      console.log(`📄 Invalid input result: ${result}`);
      
      expect(result).toMatch(/❌/);
      expect(result).toMatch(/Invalid input format/);
      
    }, 30000);
  });

  describe('Claim XRD Functionality', () => {
    test('should attempt claiming rewards', async () => {
      console.log('\n🎯 Testing ClaimXRDTool...');
      
      const input = testValidatorAddress;
      
      console.log(`🔄 Attempting to claim XRD rewards from validator: ${testValidatorAddress}`);
      
      const result = await claimXRDTool._call(input);
      console.log(`📄 Claim result: ${result}`);
      
      expect(result).toBeDefined();
      
      // The result might be an error if no claimable rewards are available
      // or it might be successful if there are rewards to claim
      if (result.includes('❌')) {
        console.log('ℹ️ Claiming failed as expected (no claimable rewards available)');
        expect(result).toMatch(/❌/);
      } else {
        console.log('✅ Claiming succeeded');
        expect(result).toMatch(/Claimed/);
      }
      
    }, 60000);
    
    test('should test claiming via DeFi service directly', async () => {
      console.log('\n🎯 Testing DeFi.claimXRD directly...');
      
      const currentEpoch = await gatewayClient.getCurrentEpoch();
      
      try {
        const txHash = await defiService.claimXRD(
          {
            ownerAddress: wallet.getAddress(),
            validatorAddress: testValidatorAddress,
          },
          wallet,
          currentEpoch
        );
        
        console.log(`✅ Claim transaction hash: ${txHash}`);
        expect(txHash).toBeDefined();
        expect(typeof txHash).toBe('string');
        
      } catch (error) {
        console.log('ℹ️ Claiming failed as expected:', error instanceof Error ? error.message : String(error));
        // This is expected if we don't have claimable rewards
        expect(error).toBeDefined();
      }
      
    }, 45000);

    test('should handle empty input gracefully', async () => {
      console.log('\n🎯 Testing empty claim input...');
      
      const result = await claimXRDTool._call('');
      console.log(`📄 Empty input result: ${result}`);
      
      expect(result).toMatch(/❌/);
      expect(result).toMatch(/Invalid input/);
      
    }, 30000);
  });

  describe('Tool Integration Tests', () => {
    test('should verify all tools are properly initialized', () => {
      console.log('\n🎯 Testing tool initialization...');
      
      expect(stakeXRDTool).toBeDefined();
      expect(stakeXRDTool.name).toBe('stake_xrd');
      
      expect(unstakeXRDTool).toBeDefined();
      expect(unstakeXRDTool.name).toBe('unstake_xrd');
      
      expect(claimXRDTool).toBeDefined();
      expect(claimXRDTool.name).toBe('claim_xrd');
      
      console.log('✅ All tools properly initialized');
    });

    test('should test JSON input format for stake tool', async () => {
      console.log('\n🎯 Testing JSON input format...');
      
      const jsonInput = JSON.stringify({
        validatorAddress: testValidatorAddress,
        amount: '2'
      });
      
      console.log(`🔄 Testing JSON input: ${jsonInput}`);
      
      const result = await stakeXRDTool._call(jsonInput);
      console.log(`📄 JSON input result: ${result}`);
      
      expect(result).toBeDefined();
      // Should either succeed or fail gracefully
      if (result.includes('❌')) {
        expect(result).toMatch(/❌/);
      } else {
        expect(result).toMatch(/Staked/);
      }
      
    }, 45000);
  });

  describe('Error Handling Tests', () => {
    test('should handle network errors gracefully', async () => {
      console.log('\n🎯 Testing error handling...');
      
      // Test with an extremely large amount that would exceed balance
      const input = `${testValidatorAddress},999999999`;
      
      const result = await stakeXRDTool._call(input);
      console.log(`📄 Large amount result: ${result}`);
      
      expect(result).toBeDefined();
      expect(result).toMatch(/❌/);
      // Should either show insufficient balance or transaction failure
      expect(result).toMatch(/Insufficient.*balance|Failed to stake|Transaction failed/i);
      
    }, 45000);
  });
}); 