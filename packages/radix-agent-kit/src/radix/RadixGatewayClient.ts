import {
  GatewayApiClient,
  GatewayStatusResponse,
  StateEntityDetailsResponse,
  TransactionStatusResponse,
  StateEntityDetailsOptIns,
  ResourceAggregationLevel,
  TransactionSubmitResponse,
} from '@radixdlt/babylon-gateway-api-sdk';

export enum RadixNetwork {
  Mainnet = 'mainnet',
  Stokenet = 'stokenet', // Updated to use Stokenet instead of RCnet
  // Add other networks as needed
}

interface RadixGatewayClientConfig {
  networkId: RadixNetwork;
  applicationName?: string;
  applicationVersion?: string;
  applicationDappDefinitionAddress?: string;
}

export class RadixGatewayClient {
  private apiClient: GatewayApiClient;
  private config: RadixGatewayClientConfig;

  constructor(config: RadixGatewayClientConfig) {
    this.config = config;
    this.apiClient = GatewayApiClient.initialize({
      basePath: this.getBasePath(config.networkId),
      applicationName: config.applicationName || 'Radix Agent Kit',
      applicationVersion: config.applicationVersion || '1.0.0',
      applicationDappDefinitionAddress: config.applicationDappDefinitionAddress,
    });
  }

  private getBasePath(networkId: RadixNetwork): string {
    switch (networkId) {
      case RadixNetwork.Mainnet:
        return 'https://mainnet.radixdlt.com';
      case RadixNetwork.Stokenet:
        return 'https://stokenet.radixdlt.com'; // Updated endpoint
      default:
        throw new Error(`Unsupported network ID: ${networkId}`);
    }
  }

  public async getGatewayStatus(): Promise<GatewayStatusResponse> {
    return this.apiClient.status.getCurrent();
  }

  public async getEntityDetails(
    entityAddress: string,
    options?: {
      opt_ins?: StateEntityDetailsOptIns;
      aggregation_level?: ResourceAggregationLevel;
    },
  ): Promise<StateEntityDetailsResponse> {
    if (!entityAddress || typeof entityAddress !== 'string') {
      throw new Error('Invalid entity address provided.');
    }
    return this.apiClient.state.innerClient.stateEntityDetails({
      stateEntityDetailsRequest: {
        addresses: [entityAddress],
        opt_ins: options?.opt_ins,
        aggregation_level: options?.aggregation_level,
      },
    });
  }

  public async getTransactionStatus(transactionIntentHash: string): Promise<TransactionStatusResponse> {
    if (!transactionIntentHash || typeof transactionIntentHash !== 'string') {
      throw new Error('Invalid transaction intent hash provided.');
    }
    return this.apiClient.transaction.getStatus(transactionIntentHash);
  }

  public async getTransactionDetails(transactionIntentHash: string): Promise<any> {
    if (!transactionIntentHash || typeof transactionIntentHash !== 'string') {
      throw new Error('Invalid transaction intent hash provided.');
    }
    return this.apiClient.transaction.getCommittedDetails(transactionIntentHash);
  }

  // Enhanced stream transactions with better error handling
  public async streamTransactions(filters: any): Promise<any> {
    console.warn('streamTransactions is not fully implemented yet and may use polling.', filters);
    // TODO: Implement actual streaming when Gateway SDK supports it
    return Promise.resolve({ message: 'Streaming not yet fully implemented.' });
  }

  public async submitTransaction(
    compiledNotarizedTransaction: string | Buffer | Uint8Array
  ): Promise<TransactionSubmitResponse> {
    let payloadHex: string;
    
    if (typeof compiledNotarizedTransaction === 'string') {
      // Assume it's already a hex string, but validate it
      if (!/^[0-9a-fA-F]+$/.test(compiledNotarizedTransaction)) {
        throw new Error('Invalid hex string format for transaction payload.');
      }
      payloadHex = compiledNotarizedTransaction;
    } else if (Buffer.isBuffer(compiledNotarizedTransaction)) {
      payloadHex = compiledNotarizedTransaction.toString('hex');
    } else if (compiledNotarizedTransaction instanceof Uint8Array) {
      payloadHex = Buffer.from(compiledNotarizedTransaction).toString('hex');
    } else {
      throw new Error('Invalid format for compiledNotarizedTransaction. Expected hex string, Buffer, or Uint8Array.');
    }

    try {
      const response = await this.apiClient.transaction.innerClient.transactionSubmit({
        transactionSubmitRequest: {
          notarized_transaction_hex: payloadHex,
        }
      });

      return response;
    } catch (error) {
      console.error('Error submitting transaction to Gateway:', error);
      if (error && typeof error === 'object' && 'body' in error && error.body) {
        const errorBody = error.body as any;
        if (errorBody.message) {
          throw new Error(`Gateway error: ${errorBody.message}`);
        }
      }
      throw error;
    }
  }

  // Helper method to get current epoch
  public async getCurrentEpoch(): Promise<number> {
    const status = await this.getGatewayStatus();
    return status.ledger_state.epoch;
  }

  // Helper method for account balances
  public async getAccountBalances(accountAddress: string): Promise<any> {
    const entityDetails = await this.getEntityDetails(accountAddress, {
      opt_ins: {
        explicit_metadata: ['name', 'symbol', 'description', 'icon_url'],
        ancestor_identities: false,
        component_royalty_config: false,
        component_royalty_vault_balance: false,
        package_royalty_vault_balance: false,
        non_fungible_include_nfids: true
      },
      aggregation_level: ResourceAggregationLevel.Vault,
    });
    
    return entityDetails;
  }
}