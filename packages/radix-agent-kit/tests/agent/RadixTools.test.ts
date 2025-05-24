import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  RadixGatewayClient,
  RadixNetwork,
} from "../../src/radix/RadixGatewayClient";
import { RadixTransactionBuilder } from "../../src/radix/RadixTransactionBuilder";
import { RadixMnemonicWallet } from "../../src/radix/MnemonicWallet";
import { NetworkId } from "@radixdlt/radix-engine-toolkit";
import {
  GetAccountInfoTool,
  GetBalancesTool,
  TransferTokensTool,
  CreateFungibleResourceTool,
  StakeXRDTool,
  createDefaultRadixTools,
} from "../../src/agent/tools";

describe("Radix LangChain Tools", () => {
  let gatewayClient: RadixGatewayClient;
  let transactionBuilder: RadixTransactionBuilder;
  let wallet: RadixMnemonicWallet;
  let networkId: number;

  beforeEach(() => {
    // Initialize test components
    gatewayClient = new RadixGatewayClient({
      networkId: RadixNetwork.Stokenet,
      applicationName: "RadixAgentKit-Test",
    });

    transactionBuilder = new RadixTransactionBuilder({
      networkId: RadixNetwork.Stokenet,
    });

    wallet = RadixMnemonicWallet.generateRandom({
      networkId: NetworkId.Stokenet,
      applicationName: "RadixAgentKit-Test",
    });

    networkId = NetworkId.Stokenet;
  });

  describe("Tool Creation", () => {
    it("should create default tools successfully", () => {
      const tools = createDefaultRadixTools(
        gatewayClient,
        transactionBuilder,
        wallet,
        networkId
      );

      expect(tools).toHaveLength(8);
      expect(tools[0]).toBeInstanceOf(GetAccountInfoTool);
      expect(tools[1]).toBeInstanceOf(GetBalancesTool);
      expect(tools[2]).toBeInstanceOf(TransferTokensTool);
      expect(tools[3]).toBeInstanceOf(CreateFungibleResourceTool);
      expect(tools[4]).toBeInstanceOf(StakeXRDTool);
    });

    it("should have correct tool names", () => {
      const tools = createDefaultRadixTools(
        gatewayClient,
        transactionBuilder,
        wallet,
        networkId
      );

      const toolNames = tools.map((tool) => tool.name);
      expect(toolNames).toContain("get_account_info");
      expect(toolNames).toContain("get_balances");
      expect(toolNames).toContain("transfer_tokens");
      expect(toolNames).toContain("create_fungible_resource");
      expect(toolNames).toContain("stake_xrd");
      expect(toolNames).toContain("add_liquidity");
      expect(toolNames).toContain("swap_tokens");
      expect(toolNames).toContain("call_component_method");
    });
  });

  describe("GetAccountInfoTool", () => {
    let tool: GetAccountInfoTool;

    beforeEach(() => {
      tool = new GetAccountInfoTool(
        gatewayClient,
        transactionBuilder,
        wallet,
        networkId
      );
    });

    it("should have correct name and description", () => {
      expect(tool.name).toBe("get_account_info");
      expect(tool.description).toContain("information about a Radix account");
    });

    it("should handle invalid address input", async () => {
      const result = await tool._call("invalid_address");
      expect(result).toContain("❌ Invalid account address format");
    });

    it("should use agent address when no input provided", async () => {
      const result = await tool._call("");
      // Should attempt to get info for agent's address (will fail but shows it's trying)
      expect(result).toMatch(/❌|🏦/);
    });
  });

  describe("GetBalancesTool", () => {
    let tool: GetBalancesTool;

    beforeEach(() => {
      tool = new GetBalancesTool(
        gatewayClient,
        transactionBuilder,
        wallet,
        networkId
      );
    });

    it("should have correct name and description", () => {
      expect(tool.name).toBe("get_balances");
      expect(tool.description).toContain("token balances");
    });

    it("should handle invalid address input", async () => {
      const result = await tool._call("invalid_address");
      expect(result).toContain("❌ Invalid account address format");
    });
  });

  describe("TransferTokensTool", () => {
    let tool: TransferTokensTool;

    beforeEach(() => {
      tool = new TransferTokensTool(
        gatewayClient,
        transactionBuilder,
        wallet,
        networkId
      );
    });

    it("should have correct name and description", () => {
      expect(tool.name).toBe("transfer_tokens");
      expect(tool.description).toContain("Transfer tokens");
    });

    it("should handle invalid input format", async () => {
      const result = await tool._call("invalid");
      expect(result).toContain("❌ Invalid input format");
    });

    it("should handle invalid destination address", async () => {
      const result = await tool._call("invalid_address,100");
      expect(result).toContain("❌ Invalid destination address");
    });

    it("should handle invalid amount", async () => {
      const validAddress =
        "account_tdx_2_1c8mulhl5yrk6hh4jsyldps5suhde36ehlqmuy7788v2l33un7rtcq3";
      const result = await tool._call(`${validAddress},-100`);
      expect(result).toContain("❌ Failed to transfer tokens");
    });
  });

  describe("CreateFungibleResourceTool", () => {
    let tool: CreateFungibleResourceTool;

    beforeEach(() => {
      tool = new CreateFungibleResourceTool(
        gatewayClient,
        transactionBuilder,
        wallet,
        networkId
      );
    });

    it("should have correct name and description", () => {
      expect(tool.name).toBe("create_fungible_resource");
      expect(tool.description).toContain("Create a new fungible token");
    });

    it("should handle invalid input format", async () => {
      const result = await tool._call("invalid");
      expect(result).toContain("❌ Invalid input format");
    });

    it("should handle empty token name", async () => {
      const result = await tool._call(",SYMBOL,1000");
      expect(result).toContain("❌ Token name cannot be empty");
    });

    it("should handle empty token symbol", async () => {
      const result = await tool._call("MyToken,,1000");
      expect(result).toContain("❌ Token symbol cannot be empty");
    });

    it("should handle invalid divisibility", async () => {
      const result = await tool._call("MyToken,SYMBOL,1000,25");
      expect(result).toContain("❌ Invalid divisibility");
    });
  });

  describe("StakeXRDTool", () => {
    let tool: StakeXRDTool;

    beforeEach(() => {
      tool = new StakeXRDTool(
        gatewayClient,
        transactionBuilder,
        wallet,
        networkId
      );
    });

    it("should have correct name and description", () => {
      expect(tool.name).toBe("stake_xrd");
      expect(tool.description).toContain("Stake XRD tokens");
    });

    it("should handle invalid input format", async () => {
      const result = await tool._call("invalid");
      expect(result).toContain("❌ Invalid input format");
    });

    it("should handle invalid validator address", async () => {
      const result = await tool._call("invalid_validator,100");
      expect(result).toContain("❌ Invalid validator address");
    });
  });

  describe("Tool Input Parsing", () => {
    let tool: TransferTokensTool;

    beforeEach(() => {
      tool = new TransferTokensTool(
        gatewayClient,
        transactionBuilder,
        wallet,
        networkId
      );
    });

    it("should handle JSON input format", async () => {
      const jsonInput = JSON.stringify({
        toAddress:
          "account_tdx_2_1c8mulhl5yrk6hh4jsyldps5suhde36ehlqmuy7788v2l33un7rtcq3",
        amount: "100",
        resourceAddress:
          "resource_tdx_2_1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxtfd2jc",
      });

      const result = await tool._call(jsonInput);
      // Should not fail on parsing, but may fail on execution
      expect(result).not.toContain("Invalid JSON input format");
    });

    it("should handle comma-separated input format", async () => {
      const csvInput =
        "account_tdx_2_1c8mulhl5yrk6hh4jsyldps5suhde36ehlqmuy7788v2l33un7rtcq3,100";

      const result = await tool._call(csvInput);
      // Should not fail on parsing, but may fail on execution
      expect(result).not.toContain("Invalid input format");
    });
  });
});
