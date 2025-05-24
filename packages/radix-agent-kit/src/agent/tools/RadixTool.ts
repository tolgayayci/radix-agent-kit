import { Tool } from "@langchain/core/tools";
import { RadixGatewayClient } from "../../radix/RadixGatewayClient";
import { RadixTransactionBuilder } from "../../radix/RadixTransactionBuilder";
import { RadixWallet } from "../../radix/RadixWallet";
import { Token } from "../../radix/Token";
import { DeFi } from "../../radix/DeFi";
import { Component } from "../../radix/Component";

/**
 * Base class for all Radix tools in the agent kit
 * Provides common functionality and access to Radix services
 */
export abstract class RadixTool extends Tool {
  protected gatewayClient: RadixGatewayClient;
  protected transactionBuilder: RadixTransactionBuilder;
  protected wallet: RadixWallet;
  protected tokenService: Token;
  protected defiService: DeFi;
  protected componentService: Component;
  protected networkId: number;

  constructor(
    gatewayClient: RadixGatewayClient,
    transactionBuilder: RadixTransactionBuilder,
    wallet: RadixWallet,
    networkId: number
  ) {
    super();
    this.gatewayClient = gatewayClient;
    this.transactionBuilder = transactionBuilder;
    this.wallet = wallet;
    this.networkId = networkId;

    // Initialize service classes
    this.tokenService = new Token(transactionBuilder, gatewayClient, networkId);
    this.defiService = new DeFi(transactionBuilder, gatewayClient, networkId);
    this.componentService = new Component(
      transactionBuilder,
      gatewayClient,
      networkId
    );
  }

  /**
   * Get current epoch from the gateway
   */
  protected async getCurrentEpoch(): Promise<number> {
    try {
      return await this.gatewayClient.getCurrentEpoch();
    } catch (error) {
      console.error("Error getting current epoch:", error);
      throw new Error(`Failed to get current epoch: ${error}`);
    }
  }

  /**
   * Format error messages for user-friendly responses
   */
  protected formatError(error: any): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  /**
   * Validate if an address is a valid Radix address
   */
  protected isValidAddress(address: string): boolean {
    return this.transactionBuilder.isValidAddress(address);
  }

  /**
   * Get the agent's account address
   */
  protected getAgentAddress(): string {
    return this.wallet.getAddress();
  }

  /**
   * Get XRD resource address for the current network
   */
  protected getXRDResourceAddress(): string {
    return this.transactionBuilder.getXRDResourceAddress();
  }

  /**
   * Parse amount string to ensure it's a valid number
   */
  protected parseAmount(amount: string | number): string {
    const parsed = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(parsed) || parsed <= 0) {
      throw new Error(`Invalid amount: ${amount}. Must be a positive number.`);
    }
    return parsed.toString();
  }

  /**
   * Format transaction result for user display
   */
  protected formatTransactionResult(txHash: string, operation: string): string {
    return `✅ ${operation} completed successfully. Transaction: ${txHash.slice(
      0,
      16
    )}...`;
  }

  /**
   * Format balance information for display
   */
  protected formatBalance(amount: string, symbol: string = "XRD"): string {
    const formatted = parseFloat(amount).toLocaleString();
    return `${formatted} ${symbol}`;
  }

  /**
   * Validate required parameters
   */
  protected validateRequiredParams(
    params: Record<string, any>,
    required: string[]
  ): void {
    for (const param of required) {
      if (!params[param]) {
        throw new Error(`Missing required parameter: ${param}`);
      }
    }
  }

  /**
   * Parse tool input string into parameters
   */
  protected parseInput(input: string): Record<string, any> {
    // Handle JSON input
    if (input.trim().startsWith("{")) {
      try {
        return JSON.parse(input);
      } catch (error) {
        throw new Error("Invalid JSON input format");
      }
    }

    // Handle comma-separated input
    const parts = input.split(",").map((part) => part.trim());
    return { input: input, parts: parts };
  }
}
