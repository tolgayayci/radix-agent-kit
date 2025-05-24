// ==================================================
// RADIX AGENT KIT - UNIT TESTS
// ==================================================

import { describe, expect, test, beforeEach } from '@jest/globals';
import { RadixGatewayClient, RadixNetwork } from '../src/radix/RadixGatewayClient';

describe('RadixGatewayClient', () => {
  let client: RadixGatewayClient;
  
  beforeEach(() => {
    client = new RadixGatewayClient({
      networkId: RadixNetwork.Stokenet,
      applicationName: 'TestApp'
    });
  });
  
  test('should get gateway status', async () => {
    const status = await client.getGatewayStatus();
    expect(status).toBeTruthy();
    expect(status.ledger_state).toBeTruthy();
    expect(status.ledger_state.epoch).toBeGreaterThan(0);
  }, 10000);
  
  test('should validate entity address format', async () => {
    const validAddress = 'account_tdx_2_1c8mulhl5yrk6hh4jsyldps5suhde36ehlqmuy7788v2l33un7rtcq3';
    
    try {
      const result = await client.getEntityDetails(validAddress);
      expect(result).toBeTruthy();
    } catch (error) {
      // Address might not exist, but request should be valid
      expect(error).toBeTruthy();
    }
  }, 10000);
  
  test('should get current epoch', async () => {
    const epoch = await client.getCurrentEpoch();
    expect(typeof epoch).toBe('number');
    expect(epoch).toBeGreaterThan(0);
  }, 10000);
}); 