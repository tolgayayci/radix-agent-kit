// ==================================================
// RADIX AGENT KIT - UNIT TESTS
// ==================================================

import { RadixTransactionBuilder } from '../src/radix/RadixTransactionBuilder';
import { RadixNetwork } from '../src/radix/RadixGatewayClient';

describe('RadixTransactionBuilder', () => {
  let builder: RadixTransactionBuilder;
  
  beforeEach(() => {
    builder = new RadixTransactionBuilder({
      networkId: RadixNetwork.Stokenet
    });
  });
  
  test('should create transfer manifest', () => {
    const manifest = builder.createTransferManifest(
      'account_tdx_2_1c8mulhl5yrk6hh4jsyldps5suhde36ehlqmuy7788v2l33un7rtcq3',
      'account_tdx_2_1c9aaqt68l4mxp24rywx5ps4l0fzm8cgrzkxe5d3qjy9jgdh38zycf8',
      builder.getXRDResourceAddress(),
      '100'
    );
    
    expect(manifest).toContain('CALL_METHOD');
    expect(manifest).toContain('withdraw');
    expect(manifest).toContain('try_deposit_or_abort');
    expect(manifest).toContain('lock_fee');
  });
  
  test('should create token manifest', () => {
    const manifest = builder.createTokenManifest(
      'account_tdx_2_1c8mulhl5yrk6hh4jsyldps5suhde36ehlqmuy7788v2l33un7rtcq3',
      'TestToken',
      'TTK',
      1000000,
      18
    );
    
    expect(manifest).toContain('CALL_FUNCTION');
    expect(manifest).toContain('FungibleResourceManager');
    expect(manifest).toContain('create_with_initial_supply');
    expect(manifest).toContain('TestToken');
    expect(manifest).toContain('TTK');
  });
  
  test('should validate addresses', () => {
    expect(builder.isValidAddress('account_tdx_2_1c8mulhl5yrk6hh4jsyldps5suhde36ehlqmuy7788v2l33un7rtcq3')).toBe(true);
    expect(builder.isValidAddress('invalid_address')).toBe(false);
    expect(builder.isValidAddress('account_rdx1234')).toBe(false); // Wrong network
  });
  
  test('should get correct resource addresses', () => {
    const xrdAddress = builder.getXRDResourceAddress();
    expect(xrdAddress).toContain('resource_tdx_2_1');
    expect(xrdAddress).toContain('radxrd');
  });
}); 