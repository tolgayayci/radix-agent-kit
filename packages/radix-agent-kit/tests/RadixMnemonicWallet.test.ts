// ==================================================
// RADIX AGENT KIT - UNIT TESTS
// ==================================================

import { describe, expect, test } from '@jest/globals';
import { RadixMnemonicWallet } from '../src/radix/MnemonicWallet';
import { NetworkId } from '@radixdlt/radix-engine-toolkit';

describe('RadixMnemonicWallet', () => {
  const testMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art';
  
  test('should create wallet from mnemonic', () => {
    const wallet = RadixMnemonicWallet.fromMnemonic(testMnemonic, {
      networkId: NetworkId.Stokenet,
      applicationName: 'TestApp'
    });
    
    expect(wallet.getAddress()).toBeTruthy();
    expect(wallet.getPublicKey()).toBeTruthy();
    expect(RadixMnemonicWallet.validateMnemonic(testMnemonic)).toBe(true);
  });
  
  test('should generate random wallet', () => {
    const wallet = RadixMnemonicWallet.generateRandom({
      networkId: NetworkId.Stokenet,
      applicationName: 'TestApp'
    });
    
    expect(wallet.getAddress()).toBeTruthy();
    expect(wallet.getMnemonic().split(' ')).toHaveLength(24);
  });
  
  test('should derive multiple accounts', async () => {
    const wallet = RadixMnemonicWallet.fromMnemonic(testMnemonic, {
      networkId: NetworkId.Stokenet,
      applicationName: 'TestApp'
    });
    
    const accounts = await wallet.deriveMultipleAccounts(0, 3);
    expect(accounts).toHaveLength(3);
    expect(accounts[0].index).toBe(0);
    expect(accounts[1].index).toBe(1);
    expect(accounts[2].index).toBe(2);
  });
  
  test('should sign data', async () => {
    const wallet = RadixMnemonicWallet.fromMnemonic(testMnemonic, {
      networkId: NetworkId.Stokenet,
      applicationName: 'TestApp'
    });
    
    const data = new TextEncoder().encode('test message');
    const signature = await wallet.sign(data);
    
    expect(signature).toBeTruthy();
    expect(typeof signature).toBe('string');
    expect(signature.length).toBeGreaterThan(0);
  });
}); 