/// Main entry point for the radix-agent-kit package

// Export RadixGatewayClient
export { RadixGatewayClient, RadixNetwork } from "./radix/RadixGatewayClient";

// Export RadixTransactionBuilder
export {
  RadixTransactionBuilder,
  SignableTransactionIntent,
  SignedTransaction,
  TransferOptions,
} from "./radix/RadixTransactionBuilder";

// Export RadixWallet interfaces and implementations
export {
  RadixWallet,
  HardwareWallet,
  VaultWallet,
  SignableTransactionIntent as WalletSignableTransactionIntent,
  SignedTransaction as WalletSignedTransaction,
} from "./radix/RadixWallet";

export {
  RadixMnemonicWallet,
  RadixWalletFactory,
  DerivedAccount,
  WalletConfig,
} from "./radix/MnemonicWallet";

// Export VaultWallet implementation
export {
  VaultWallet as VaultWalletImpl,
  VaultWalletConfig,
  createVaultKey,
  exportVaultPublicKey,
} from "./radix/VaultWallet";

// Export RadixAccount
export {
  RadixAccount,
  AccountInfo,
  AccountBalance,
  CreateAccountOptions,
} from "./radix/RadixAccount";

// Export Token class and interfaces
export {
  Token,
  FungibleResourceOptions,
  NonFungibleResourceOptions,
  TokenTransferOptions,
  NFTMintOptions,
} from "./radix/Token";

// Export DeFi class and interfaces
export {
  DeFi,
  StakeXRDOptions,
  UnstakeXRDOptions,
  ClaimXRDOptions,
  CreatePoolOptions,
  AddLiquidityOptions,
  RemoveLiquidityOptions,
  SwapTokensOptions,
  PoolInfo,
  FlashLoanOptions,
  HookExecutionOptions,
} from "./radix/DeFi";

// Export Component class and interfaces
export {
  Component,
  CallComponentMethodOptions,
  GetComponentStateOptions,
} from "./radix/Component";

// Export security features
export {
  SecureKeyStorage,
  KeyStorageOptions,
  StoredKeyData,
  createSecureKeyStorage,
} from "./security/KeyStorage";

export {
  TransactionSecurity,
  TransactionValidationOptions,
  RateLimitOptions,
  ValidationResult,
  InputValidator,
  SecureLogger,
} from "./security/TransactionSecurity";

// Export utility functions
export * from "./utils";

// Export agent functionality
export * from "./agent";

export { FaucetHelper } from './utils/FaucetHelper';
