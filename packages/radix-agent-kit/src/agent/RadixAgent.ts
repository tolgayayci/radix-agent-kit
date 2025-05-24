import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { ChatOpenAI } from "@langchain/openai";
import { BufferMemory } from "langchain/memory";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { RadixGatewayClient, RadixNetwork } from "../radix/RadixGatewayClient";
import { RadixTransactionBuilder } from "../radix/RadixTransactionBuilder";
import { RadixWallet } from "../radix/RadixWallet";
import { RadixMnemonicWallet } from "../radix/MnemonicWallet";
import { createDefaultRadixTools, RadixTool } from "./tools";
import { NetworkId } from "@radixdlt/radix-engine-toolkit";

/**
 * Configuration for the Radix Agent
 */
export interface RadixAgentConfig {
  /** Network to connect to */
  networkId: RadixNetwork;
  /** Application name for Gateway API */
  applicationName?: string;
  /** OpenAI API key for LLM */
  openaiApiKey?: string;
  /** LLM model to use */
  model?: string;
  /** Temperature for LLM responses */
  temperature?: number;
  /** Whether to use memory for conversations */
  useMemory?: boolean;
  /** Custom tools to add to the agent */
  customTools?: RadixTool[];
  /** Wallet to use (if not provided, will need to be set separately) */
  wallet?: RadixWallet;
  /** Mnemonic for creating a wallet */
  mnemonic?: string;
}

/**
 * Main Radix Agent class that integrates LangChain with Radix DLT
 */
export class RadixAgent {
  private gatewayClient: RadixGatewayClient;
  private transactionBuilder: RadixTransactionBuilder;
  private wallet?: RadixWallet;
  private tools: RadixTool[];
  private llm: ChatOpenAI;
  private memory?: BufferMemory;
  private agent?: AgentExecutor;
  private networkId: number;
  private config: RadixAgentConfig;

  constructor(config: RadixAgentConfig) {
    this.config = config;
    this.networkId = this.mapRadixNetworkToNetworkId(config.networkId);

    // Initialize Gateway client
    this.gatewayClient = new RadixGatewayClient({
      networkId: config.networkId,
      applicationName: config.applicationName || "RadixAgentKit",
    });

    // Initialize transaction builder
    this.transactionBuilder = new RadixTransactionBuilder({
      networkId: config.networkId,
    });

    // Initialize LLM
    this.llm = new ChatOpenAI({
      openAIApiKey: config.openaiApiKey || process.env.OPENAI_API_KEY,
      modelName: config.model || "gpt-4",
      temperature: config.temperature || 0.1,
    });

    // Initialize memory if requested
    if (config.useMemory) {
      this.memory = new BufferMemory({
        memoryKey: "chat_history",
        returnMessages: true,
      });
    }

    // Set up wallet if provided
    if (config.wallet) {
      this.wallet = config.wallet;
    } else if (config.mnemonic) {
      this.wallet = RadixMnemonicWallet.fromMnemonic(config.mnemonic, {
        networkId: this.networkId,
        applicationName: config.applicationName || "RadixAgentKit",
      });
    }

    // Initialize tools
    this.tools = [];
    this.initializeTools();
  }

  /**
   * Map RadixNetwork to NetworkId
   */
  private mapRadixNetworkToNetworkId(network: RadixNetwork): number {
    switch (network) {
      case RadixNetwork.Mainnet:
        return NetworkId.Mainnet;
      case RadixNetwork.Stokenet:
        return NetworkId.Stokenet;
      default:
        throw new Error(`Unsupported network: ${network}`);
    }
  }

  /**
   * Initialize tools for the agent
   */
  private initializeTools(): void {
    if (!this.wallet) {
      console.warn("No wallet provided. Some tools may not work properly.");
      return;
    }

    // Create default tools
    const defaultTools = createDefaultRadixTools(
      this.gatewayClient,
      this.transactionBuilder,
      this.wallet,
      this.networkId
    );

    // Add custom tools if provided
    const customTools = this.config.customTools || [];

    this.tools = [...defaultTools, ...customTools];
  }

  /**
   * Initialize the LangChain agent
   */
  private async initializeAgent(): Promise<void> {
    if (!this.wallet) {
      throw new Error("Wallet is required to initialize the agent");
    }

    // Create system prompt
    const systemPrompt = `You are a helpful AI assistant that can interact with the Radix DLT blockchain.

You have access to various tools that allow you to:
- Get account information and balances
- Transfer tokens between accounts
- Create new fungible tokens
- Stake XRD with validators
- Add liquidity to pools
- Swap tokens in pools
- Call methods on Radix components

Your account address is: ${this.wallet.getAddress()}

When users ask you to perform blockchain operations, use the appropriate tools to help them.
Always be clear about what you're doing and provide transaction details when operations complete.

If you need clarification about parameters or if something seems risky, ask the user for confirmation.
Be helpful, accurate, and secure in your responses.`;

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", systemPrompt],
      new MessagesPlaceholder("chat_history"),
      ["human", "{input}"],
      new MessagesPlaceholder("agent_scratchpad"),
    ]);

    // Create the agent
    const agent = await createOpenAIFunctionsAgent({
      llm: this.llm,
      tools: this.tools,
      prompt,
    });

    // Create agent executor
    this.agent = new AgentExecutor({
      agent,
      tools: this.tools,
      memory: this.memory,
      verbose: process.env.NODE_ENV === "development",
      maxIterations: 10,
    });
  }

  /**
   * Set the wallet for the agent
   */
  public setWallet(wallet: RadixWallet): void {
    this.wallet = wallet;
    this.initializeTools();
    // Reset agent to reinitialize with new wallet
    this.agent = undefined;
  }

  /**
   * Create a wallet from mnemonic
   */
  public createWalletFromMnemonic(mnemonic: string): RadixWallet {
    const wallet = RadixMnemonicWallet.fromMnemonic(mnemonic, {
      networkId: this.networkId,
      applicationName: this.config.applicationName || "RadixAgentKit",
    });
    this.setWallet(wallet);
    return wallet;
  }

  /**
   * Generate a new wallet
   */
  public generateNewWallet(): { wallet: RadixWallet; mnemonic: string } {
    const wallet = RadixMnemonicWallet.generateRandom({
      networkId: this.networkId,
      applicationName: this.config.applicationName || "RadixAgentKit",
    });
    const mnemonic = (wallet as RadixMnemonicWallet).getMnemonic();
    this.setWallet(wallet);
    return { wallet, mnemonic };
  }

  /**
   * Run the agent with user input
   */
  public async run(input: string): Promise<string> {
    if (!this.agent) {
      await this.initializeAgent();
    }

    if (!this.agent) {
      throw new Error("Failed to initialize agent");
    }

    try {
      const result = await this.agent.invoke({
        input: input,
      });

      return (
        result.output || "I apologize, but I couldn't process your request."
      );
    } catch (error) {
      console.error("Error running agent:", error);
      return `I encountered an error: ${
        error instanceof Error ? error.message : String(error)
      }`;
    }
  }

  /**
   * Get agent information
   */
  public getInfo(): {
    networkId: RadixNetwork;
    walletAddress?: string;
    toolCount: number;
    hasMemory: boolean;
  } {
    return {
      networkId: this.config.networkId,
      walletAddress: this.wallet?.getAddress(),
      toolCount: this.tools.length,
      hasMemory: !!this.memory,
    };
  }

  /**
   * Get available tools
   */
  public getTools(): RadixTool[] {
    return [...this.tools];
  }

  /**
   * Add a custom tool
   */
  public addTool(tool: RadixTool): void {
    this.tools.push(tool);
    // Reset agent to reinitialize with new tools
    this.agent = undefined;
  }

  /**
   * Clear conversation memory
   */
  public clearMemory(): void {
    if (this.memory) {
      this.memory.clear();
    }
  }

  /**
   * Get the gateway client
   */
  public getGatewayClient(): RadixGatewayClient {
    return this.gatewayClient;
  }

  /**
   * Get the transaction builder
   */
  public getTransactionBuilder(): RadixTransactionBuilder {
    return this.transactionBuilder;
  }

  /**
   * Get the wallet
   */
  public getWallet(): RadixWallet | undefined {
    return this.wallet;
  }
}

/**
 * Factory function to create a Radix Agent
 */
export async function createRadixAgent(
  config: RadixAgentConfig
): Promise<RadixAgent> {
  const agent = new RadixAgent(config);
  return agent;
}
