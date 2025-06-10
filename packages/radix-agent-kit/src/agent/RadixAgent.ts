import { AgentExecutor, createOpenAIToolsAgent } from "langchain/agents";
import { ChatOpenAI } from "@langchain/openai";
import { BufferMemory } from "langchain/memory";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { RadixGatewayClient, RadixNetwork } from '../radix/RadixGatewayClient';
import { RadixTransactionBuilder } from '../radix/RadixTransactionBuilder';
import { RadixWallet } from '../radix/RadixWallet';
import { RadixMnemonicWallet } from '../radix/MnemonicWallet';
import { FaucetHelper } from '../utils/FaucetHelper';
import { createDefaultRadixTools } from "./tools";
import { NetworkId } from "@radixdlt/radix-engine-toolkit";
import { z } from "zod";

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
  customTools?: DynamicStructuredTool[];
  /** Wallet to use (if not provided, will need to be set separately) */
  wallet?: RadixWallet;
  /** Mnemonic for creating a wallet */
  mnemonic?: string;
  /** Maximum iterations for agent execution */
  maxIterations?: number;
  /** Whether to enable verbose logging */
  verbose?: boolean;
  /** Skip automatic funding of new wallets */
  skipAutoFunding?: boolean;
}

/**
 * Main Radix Agent class that integrates LangChain with Radix DLT
 */
export class RadixAgent {
  private gatewayClient: RadixGatewayClient;
  private transactionBuilder: RadixTransactionBuilder;
  private wallet?: RadixWallet;
  private tools: DynamicStructuredTool[];
  private llm: ChatOpenAI;
  private memory?: BufferMemory;
  private agent?: AgentExecutor;
  private networkId: number;
  private config: RadixAgentConfig;

  constructor(config: RadixAgentConfig) {
    this.config = config;
    
    // Security: If no mnemonic provided, force Stokenet network for safety
    if (!config.mnemonic && !config.wallet && config.networkId === RadixNetwork.Mainnet) {
      console.warn('⚠️ No wallet credentials provided. Forcing Stokenet network for security.');
      this.config.networkId = RadixNetwork.Stokenet;
    }
    
    this.networkId = this.mapRadixNetworkToNetworkId(this.config.networkId);

    // Initialize Gateway client
    this.gatewayClient = new RadixGatewayClient({
      networkId: this.config.networkId,
      applicationName: config.applicationName || "RadixAgentKit",
    });

    // Initialize transaction builder
    this.transactionBuilder = new RadixTransactionBuilder({
      networkId: this.config.networkId,
    });

    // Initialize LLM with better configuration
    this.llm = new ChatOpenAI({
      openAIApiKey: config.openaiApiKey || process.env.OPENAI_API_KEY,
      modelName: config.model || "gpt-4",
      temperature: config.temperature || 0.1,
      maxTokens: 2000,
      timeout: 30000, // 30 second timeout
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
    // If no wallet, it will be created during initialization

    // Initialize tools (only if wallet is available)
    this.tools = [];
    if (this.wallet) {
      this.initializeTools();
    }
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

    try {
      // Create default tools with error handling
    const defaultTools = createDefaultRadixTools(
      this.gatewayClient,
      this.transactionBuilder,
      this.wallet,
      this.networkId
      ) as DynamicStructuredTool[];

    // Add custom tools if provided
    const customTools = this.config.customTools || [];

    this.tools = [...defaultTools, ...customTools];
      
      console.log(`✅ Agent ready with ${this.tools.length} tools\n`);
    } catch (error) {
      console.error("Error initializing tools:", error);
      this.tools = [];
    }
  }

  /**
   * Initialize the LangChain agent with improved configuration
   */
  private async initializeAgent(): Promise<void> {
    if (!this.wallet) {
      throw new Error("Wallet is required to initialize the agent");
    }

    if (this.tools.length === 0) {
      throw new Error("No tools available. Cannot initialize agent.");
    }

    try {
      // Create enhanced system prompt with better instructions
      const systemPrompt = `You are a helpful AI assistant specialized in interacting with the Radix DLT blockchain.

IMPORTANT INSTRUCTIONS:
- You have access to ${this.tools.length} specialized tools for Radix blockchain operations
- Your account address is: ${this.wallet.getAddress()}
- Always use the appropriate tools to answer user questions about blockchain data
- When a tool call fails, explain the error clearly and suggest alternatives
- Be specific and accurate in your responses
- If you need to perform blockchain operations, use the tools provided

AVAILABLE CAPABILITIES:
- Get account information and balances
- Transfer tokens between accounts
- Create new fungible tokens
- Stake XRD with validators
- Add liquidity to pools
- Swap tokens in pools
- Call methods on Radix components
- Get current epoch information

TOOL USAGE GUIDELINES:
- Always try to use tools when users ask about blockchain data
- If a tool fails, explain what went wrong and try alternative approaches
- Provide clear explanations of what each operation does
- Ask for confirmation before performing transactions that cost fees

Be helpful, accurate, and always use your tools to provide real blockchain data.`;

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", systemPrompt],
      new MessagesPlaceholder("chat_history"),
      ["human", "{input}"],
      new MessagesPlaceholder("agent_scratchpad"),
    ]);

      // Create the agent with better error handling
      const agent = await createOpenAIToolsAgent({
      llm: this.llm,
      tools: this.tools,
      prompt,
    });

      // Create agent executor with improved configuration
    this.agent = new AgentExecutor({
      agent,
      tools: this.tools,
      memory: this.memory,
        verbose: this.config.verbose ?? (process.env.NODE_ENV === "development"),
        maxIterations: this.config.maxIterations || 15,
        returnIntermediateSteps: true,
        // Add custom error handling
        handleParsingErrors: (error: Error) => {
          console.error("Agent parsing error:", error);
          return `I encountered a parsing error: ${error.message}. Let me try a different approach.`;
        },
    });

      console.log("✅ Agent initialized successfully");
    } catch (error) {
      console.error("Failed to initialize agent:", error);
      throw new Error(`Agent initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Set the wallet for the agent
   */
  public setWallet(wallet: RadixWallet): void {
    this.wallet = wallet;
    this.initializeTools();
    // Reset agent to reinitialize with new wallet and tools
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

    // Check if wallet needs funding on Stokenet
    if (this.config.networkId === RadixNetwork.Stokenet) {
      this.checkAndFundWalletAsync(wallet).catch(error => {
        console.warn('⚠️ Wallet funding check failed:', error);
      });
    }

    return wallet;
  }

  /**
   * Auto-fund wallet asynchronously (non-blocking)
   */
  private async autoFundWalletAsync(wallet: RadixWallet): Promise<void> {
    try {
      const { FaucetHelper } = await import('../utils/FaucetHelper');
      const faucetHelper = new FaucetHelper(RadixNetwork.Stokenet);
      await faucetHelper.autoFundNewWallet(wallet);
    } catch (error) {
      console.warn('Auto-funding failed:', error);
    }
  }

  /**
   * Check if wallet has sufficient balance and fund if needed
   */
  private async checkAndFundWalletAsync(wallet: RadixWallet): Promise<void> {
    try {
      const { FaucetHelper } = await import('../utils/FaucetHelper');
      const faucetHelper = new FaucetHelper(RadixNetwork.Stokenet);
      
      const balance = await faucetHelper.getXRDBalance(wallet);
      if (balance < 50) { // If less than 50 XRD, try to fund
        console.log(`💰 Wallet has low balance (${balance} XRD), attempting to fund...`);
        await faucetHelper.autoFundNewWallet(wallet, 50);
      }
    } catch (error) {
      console.warn('Wallet balance check failed:', error);
    }
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

    // Auto-fund wallet if on Stokenet
    if (this.config.networkId === RadixNetwork.Stokenet) {
      this.autoFundWalletAsync(wallet).catch(error => {
        console.warn('⚠️ Auto-funding failed for new wallet:', error);
        console.log('💡 Manual funding required. Visit: https://stokenet-dashboard.radixdlt.com/');
      });
    }

    return { wallet, mnemonic };
  }

  /**
   * Generate a new wallet with proper async address derivation
   */
  public async generateNewWalletAsync(): Promise<{ wallet: RadixWallet; mnemonic: string }> {
    const wallet = await RadixMnemonicWallet.generateRandomAsync({
      networkId: this.networkId,
      applicationName: this.config.applicationName || "RadixAgentKit",
    });
    const mnemonic = (wallet as RadixMnemonicWallet).getMnemonic();
    this.setWallet(wallet);

    // Auto-fund wallet if on Stokenet
    if (this.config.networkId === RadixNetwork.Stokenet) {
      try {
        console.log('🚀 Auto-funding newly created wallet...');
        const { FaucetHelper } = await import('../utils/FaucetHelper');
        const faucetHelper = new FaucetHelper(RadixNetwork.Stokenet);
        const funded = await faucetHelper.autoFundNewWallet(wallet);
        
        if (funded) {
          console.log('✅ New wallet successfully funded with testnet XRD');
        } else {
          console.warn('⚠️ Auto-funding failed - manual funding may be required');
          console.log('💡 Get testnet XRD from: https://stokenet-dashboard.radixdlt.com/');
        }
      } catch (error) {
        console.warn('⚠️ Auto-funding failed for new wallet:', error);
        console.log('💡 Manual funding required. Visit: https://stokenet-dashboard.radixdlt.com/');
      }
    }

    return { wallet, mnemonic };
  }

  /**
   * Run the agent with user input - Enhanced with better error handling
   */
  public async run(input: string): Promise<string> {
    if (!input || input.trim().length === 0) {
      return "Please provide a question or request for me to help with.";
    }

    if (!this.wallet) {
      throw new Error("No wallet available. This should not happen after proper initialization.");
    }

    try {
      // Initialize agent if not already done
    if (!this.agent) {
      await this.initializeAgent();
    }

    if (!this.agent) {
      throw new Error("Failed to initialize agent");
    }

      // Prepare input parameters with proper structure
      const inputParams: any = {
        input: input.trim(),
      };

      // Handle chat history properly
      if (this.memory) {
        try {
        const memoryVariables = await this.memory.loadMemoryVariables({});
        inputParams.chat_history = memoryVariables.chat_history || [];
        } catch (memoryError) {
          inputParams.chat_history = [];
        }
      } else {
        inputParams.chat_history = [];
      }

      // Execute the agent with timeout
      const result = await Promise.race([
        this.agent.invoke(inputParams),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Agent execution timeout")), 60000)
        )
      ]) as any;

      // Extract and validate result
      if (result && result.output) {
        const output = result.output.trim();
        if (output && output !== "I apologize, but I couldn't process your request.") {
          return output;
        }
      }

      // If we get here, the agent didn't provide a useful response
      if (result.intermediateSteps && result.intermediateSteps.length > 0) {
        const lastStep = result.intermediateSteps[result.intermediateSteps.length - 1];
        if (lastStep.observation) {
          return `Based on the available information: ${lastStep.observation}`;
        }
      }

      return "I'm having trouble processing your request right now. Could you please rephrase your question or try asking about something specific like account balances or current epoch?";

    } catch (error) {
      console.error("❌ Error running agent:", error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes("timeout")) {
          return "The request took too long to process. Please try a simpler query or try again.";
        }
        if (error.message.includes("API")) {
          return "There was an issue connecting to the Radix network. Please check your connection and try again.";
        }
        if (error.message.includes("tool")) {
          return `There was an issue with one of my tools: ${error.message}. Please try rephrasing your request.`;
        }
        return `I encountered an error: ${error.message}. Please try rephrasing your request or ask for help with a specific task.`;
      }
      
      return "I encountered an unexpected error. Please try again with a different request.";
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
  public getTools(): DynamicStructuredTool[] {
    return [...this.tools];
  }

  /**
   * Add a custom tool
   */
  public addTool(tool: DynamicStructuredTool): void {
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

  /**
   * Get the faucet helper for funding wallets
   */
  public getFaucetHelper(): FaucetHelper {
    return new FaucetHelper(this.config.networkId);
  }

  /**
   * Initialize the agent, creating wallet if needed
   */
  public async initialize(): Promise<void> {
    // Create wallet if none provided
    if (!this.wallet) {
      await this.createAndFundWalletAsync();
    }
    
    // Initialize tools now that wallet is available
    if (this.wallet && this.tools.length === 0) {
      this.initializeTools();
    }
  }

  /**
   * Create and fund a wallet asynchronously with proper address derivation
   */
  private async createAndFundWalletAsync(): Promise<void> {
    console.log('🔐 No wallet provided. Creating new wallet on Stokenet...\n');
    
    // Create wallet with async address derivation
    const wallet = await RadixMnemonicWallet.generateRandomAsync({
      networkId: this.networkId,
      applicationName: this.config.applicationName || "RadixAgentKit",
    });
    
    const mnemonic = wallet.getMnemonic();
    let address = wallet.getAddress();
    
    // Wait for proper address derivation if needed
    if (address.includes('pending') && (wallet as any).waitForProperAddress) {
      console.log('⏳ Waiting for address derivation...');
      await (wallet as any).waitForProperAddress();
      address = wallet.getAddress();
    }
    
    // Set the wallet
    this.wallet = wallet;
    
    // Get current balance
    let balance = 0;
    if (this.config.networkId === RadixNetwork.Stokenet) {
      try {
        const { FaucetHelper } = await import('../utils/FaucetHelper');
        const faucetHelper = new FaucetHelper(RadixNetwork.Stokenet);
        balance = await faucetHelper.getXRDBalance(wallet);
      } catch (error) {
        console.warn('Could not check initial balance:', error);
      }
    }
    
    // Show wallet details to user
    console.log('\n✅ New wallet ready:');
    console.log(`   Address: ${address}`);
    console.log(`   Balance: ${balance} XRD${balance > 0 ? ' ✅' : ' ⚠️ (needs funding)'}`);
    console.log(`   Mnemonic: ${mnemonic}`);
    console.log(`   Network: ${this.config.networkId}`);
    console.log(`   Dashboard: https://stokenet-dashboard.radixdlt.com/account/${address}`);
    console.log('⚠️  Save your mnemonic phrase securely!\n');
    
    if (balance === 0) {
      console.log('💡 To fund your wallet, simply ask me: "Fund my wallet with testnet XRD"');
      console.log('💡 Or visit: https://stokenet-dashboard.radixdlt.com/ for manual funding\n');
    }
  }
}

/**
 * Factory function to create a Radix Agent with proper initialization
 */
export async function createRadixAgent(
  config: RadixAgentConfig
): Promise<RadixAgent> {
  const agent = new RadixAgent(config);
  await agent.initialize();
  return agent;
}
