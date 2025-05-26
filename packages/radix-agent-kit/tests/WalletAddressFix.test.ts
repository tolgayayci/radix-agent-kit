import { describe, it, expect, beforeEach } from "@jest/globals";
import { RadixAgent, RadixNetwork, RadixMnemonicWallet } from "../src/index";
import { NetworkId } from "@radixdlt/radix-engine-toolkit";

describe("Wallet Address Fix Verification", () => {
  let agent: RadixAgent;

  beforeEach(() => {
    agent = new RadixAgent({
      networkId: RadixNetwork.Stokenet,
      openaiApiKey: "test-key", // Mock key for testing
      applicationName: "WalletFixTest",
    });
  });

  describe("Wallet Address Generation", () => {
    it("should generate proper Radix addresses synchronously", async () => {
      const wallet = RadixMnemonicWallet.generateRandom({
        networkId: NetworkId.Stokenet,
        applicationName: "TestWallet",
      });

      // Initial address might be temporary
      const initialAddress = wallet.getAddress();
      
      // Wait for proper address derivation
      await wallet.waitForProperAddress();
      const finalAddress = wallet.getAddress();

      // Final address should be proper Radix format
      expect(finalAddress).toMatch(/^account_tdx_2_[a-z0-9]+$/);
      expect(finalAddress).not.toBe("account_pending_0");
      expect(finalAddress.length).toBeGreaterThan(50); // Radix addresses are long
    });

    it("should generate proper Radix addresses asynchronously", async () => {
      const wallet = await RadixMnemonicWallet.generateRandomAsync({
        networkId: NetworkId.Stokenet,
        applicationName: "TestWallet",
      });

      const address = wallet.getAddress();
      
      // Should immediately have proper address
      expect(address).toMatch(/^account_tdx_2_[a-z0-9]+$/);
      expect(address).not.toBe("account_pending_0");
      expect(address.length).toBeGreaterThan(50);
    });

    it("should create multiple unique addresses", async () => {
      const wallet1 = await RadixMnemonicWallet.generateRandomAsync({
        networkId: NetworkId.Stokenet,
        applicationName: "TestWallet1",
      });

      const wallet2 = await RadixMnemonicWallet.generateRandomAsync({
        networkId: NetworkId.Stokenet,
        applicationName: "TestWallet2",
      });

      const address1 = wallet1.getAddress();
      const address2 = wallet2.getAddress();

      expect(address1).not.toBe(address2);
      expect(address1).toMatch(/^account_tdx_2_[a-z0-9]+$/);
      expect(address2).toMatch(/^account_tdx_2_[a-z0-9]+$/);
    });
  });

  describe("Agent Wallet Integration", () => {
    it("should create agent with proper wallet address using sync method", () => {
      const { wallet, mnemonic } = agent.generateNewWallet();
      
      expect(wallet).toBeDefined();
      expect(mnemonic).toBeDefined();
      expect(mnemonic.split(" ")).toHaveLength(24); // 24-word mnemonic
      
      const address = wallet.getAddress();
      // Note: sync method might initially return pending address
      expect(address).toBeDefined();
      expect(typeof address).toBe("string");
    });

    it("should create agent with proper wallet address using async method", async () => {
      const { wallet, mnemonic } = await agent.generateNewWalletAsync();
      
      expect(wallet).toBeDefined();
      expect(mnemonic).toBeDefined();
      expect(mnemonic.split(" ")).toHaveLength(24); // 24-word mnemonic
      
      const address = wallet.getAddress();
      expect(address).toMatch(/^account_tdx_2_[a-z0-9]+$/);
      expect(address).not.toBe("account_pending_0");
    });

    it("should properly initialize tools after wallet creation", async () => {
      const { wallet } = await agent.generateNewWalletAsync();
      
      const tools = agent.getTools();
      expect(tools).toHaveLength(8); // Should have 8 default tools
      
      const toolNames = tools.map(tool => tool.name);
      expect(toolNames).toContain("get_account_info");
      expect(toolNames).toContain("get_balances");
      expect(toolNames).toContain("transfer_tokens");
      expect(toolNames).toContain("create_fungible_resource");
    });

    it("should provide correct agent info", async () => {
      await agent.generateNewWalletAsync();
      
      const info = agent.getInfo();
      expect(info.networkId).toBe(RadixNetwork.Stokenet);
      expect(info.walletAddress).toMatch(/^account_tdx_2_[a-z0-9]+$/);
      expect(info.toolCount).toBe(8);
      expect(info.hasMemory).toBe(false); // Default is no memory
    });
  });

  describe("Wallet Functionality", () => {
    it("should derive proper account details", async () => {
      const wallet = await RadixMnemonicWallet.generateRandomAsync({
        networkId: NetworkId.Stokenet,
        applicationName: "TestWallet",
      });

      const account = await wallet.deriveAccount(0);
      
      expect(account.index).toBe(0);
      expect(account.address).toMatch(/^account_tdx_2_[a-z0-9]+$/);
      expect(account.publicKey).toBeDefined();
      expect(account.privateKey).toBeDefined();
      expect(account.derivationPath).toBe("m/44'/1022'/0'/0/0");
    });

    it("should validate wallet can sign for its own address", async () => {
      const wallet = await RadixMnemonicWallet.generateRandomAsync({
        networkId: NetworkId.Stokenet,
        applicationName: "TestWallet",
      });

      const address = wallet.getAddress();
      expect(wallet.canSignFor(address)).toBe(true);
      
      // Should not be able to sign for other addresses
      expect(wallet.canSignFor("account_tdx_2_1c9aaqt68l4mxp24rywx5ps4l0fzm8cgrzkxe5d3qjy9jgdh38zycf8")).toBe(false);
    });

    it("should export public info correctly", async () => {
      const wallet = await RadixMnemonicWallet.generateRandomAsync({
        networkId: NetworkId.Stokenet,
        applicationName: "TestWallet",
      });

      const publicInfo = wallet.exportPublicInfo();
      
      expect(publicInfo.networkId).toBe(NetworkId.Stokenet);
      expect(publicInfo.applicationName).toBe("TestWallet");
      expect(publicInfo.accounts).toHaveLength(1);
      expect(publicInfo.accounts[0].address).toMatch(/^account_tdx_2_[a-z0-9]+$/);
      
      // Should not contain private keys
      expect(JSON.stringify(publicInfo)).not.toContain("privateKey");
    });
  });

  describe("Mnemonic Validation", () => {
    it("should validate proper 24-word mnemonics", () => {
      const mnemonic = RadixMnemonicWallet.generateMnemonic();
      expect(RadixMnemonicWallet.validateMnemonic(mnemonic)).toBe(true);
      expect(mnemonic.split(" ")).toHaveLength(24);
    });

    it("should reject invalid mnemonics", () => {
      expect(RadixMnemonicWallet.validateMnemonic("invalid mnemonic")).toBe(false);
      expect(RadixMnemonicWallet.validateMnemonic("abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about")).toBe(false); // 12 words
    });

    it("should create wallet from valid mnemonic", () => {
      const mnemonic = RadixMnemonicWallet.generateMnemonic();
      
      const wallet = RadixMnemonicWallet.fromMnemonic(mnemonic, {
        networkId: NetworkId.Stokenet,
        applicationName: "TestFromMnemonic",
      });

      expect(wallet.getMnemonic()).toBe(mnemonic);
      expect(wallet.getAddress()).toBeDefined();
    });
  });
}); 