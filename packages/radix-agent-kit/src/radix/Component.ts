import { RadixTransactionBuilder } from "./RadixTransactionBuilder";
import { RadixGatewayClient } from "./RadixGatewayClient";
import { RadixWallet } from "./RadixWallet";

/**
 * Options for calling a component method
 */
export interface CallComponentMethodOptions {
  /**
   * Owner account address
   */
  ownerAddress: string;

  /**
   * Component address
   */
  componentAddress: string;

  /**
   * Method name to call
   */
  method: string;

  /**
   * Arguments to pass to the method
   */
  args: any[];
}

/**
 * Options for getting component state
 */
export interface GetComponentStateOptions {
  /**
   * Component address
   */
  componentAddress: string;
}

/**
 * Component interaction operations for Radix
 */
export class Component {
  private transactionBuilder: RadixTransactionBuilder;
  private gatewayClient: RadixGatewayClient;
  private networkId: number;

  /**
   * Create a new Component instance
   *
   * @param transactionBuilder - Transaction builder
   * @param gatewayClient - Gateway client
   * @param networkId - Network ID
   */
  constructor(
    transactionBuilder: RadixTransactionBuilder,
    gatewayClient: RadixGatewayClient,
    networkId: number
  ) {
    this.transactionBuilder = transactionBuilder;
    this.gatewayClient = gatewayClient;
    this.networkId = networkId;
  }

  /**
   * Call a method on a component
   *
   * @param options - Call component method options
   * @param ownerWallet - Wallet for signing transactions
   * @param currentEpoch - Current epoch for transaction validity
   * @returns Transaction hash
   */
  async callComponentMethod(
    options: CallComponentMethodOptions,
    ownerWallet: RadixWallet,
    currentEpoch: number
  ): Promise<string> {
    try {
      const { ownerAddress, componentAddress, method, args } = options;

      const ownerPrivateKey = RadixTransactionBuilder.createPrivateKeyFromHex(
        ownerWallet.getPublicKey(),
        "Ed25519"
      );

      // Format arguments for the manifest
      const formattedArgs = this.formatArgumentsForManifest(args);

      // Create a manifest for calling the component method
      const manifest = `
        CALL_METHOD
          Address("${ownerAddress}")
          "lock_fee"
          Decimal("10");
        
        CALL_METHOD
          Address("${componentAddress}")
          "${method}"
          ${formattedArgs};
        
        CALL_METHOD
          Address("${ownerAddress}")
          "deposit_batch"
          Expression("ENTIRE_WORKTOP");
      `;

      // Build and submit transaction
      const compiledTransaction =
        await this.transactionBuilder.buildCustomManifestTransaction(
          manifest,
          ownerPrivateKey,
          currentEpoch,
          `Call ${method} on component ${componentAddress}`
        );

      const txHex =
        this.transactionBuilder.getCompiledTransactionHex(compiledTransaction);
      const submitResult = await this.gatewayClient.submitTransaction(txHex);

      if (submitResult.duplicate) {
        throw new Error("Transaction was duplicate");
      }

      return txHex;
    } catch (error) {
      console.error("Error calling component method:", error);
      throw new Error(`Failed to call component method: ${error}`);
    }
  }

  /**
   * Get the state of a component
   *
   * @param options - Get component state options
   * @returns Component state
   */
  async getComponentState(options: GetComponentStateOptions): Promise<any> {
    try {
      const { componentAddress } = options;

      // Get component details from the gateway
      const componentDetails = await this.gatewayClient.getEntityDetails(
        componentAddress,
        {
          opt_ins: {
            explicit_metadata: ["name", "symbol", "description", "icon_url"],
            ancestor_identities: true,
            component_royalty_config: true,
            component_royalty_vault_balance: true,
            package_royalty_vault_balance: true,
            non_fungible_include_nfids: true,
          },
        }
      );

      // Extract and return the component state
      if (componentDetails.items && componentDetails.items.length > 0) {
        const componentData = componentDetails.items[0];

        // Use type assertion to tell TypeScript that details has a state property
        const details = componentData.details as any;

        return {
          address: componentAddress,
          details: componentData.details,
          // Access state safely with optional chaining
          state: details?.state || {},
          metadata: componentData.metadata || {},
        };
      } else {
        throw new Error(`Component ${componentAddress} not found`);
      }
    } catch (error) {
      console.error("Error getting component state:", error);
      throw new Error(`Failed to get component state: ${error}`);
    }
  }

  /**
   * Format arguments for the manifest
   *
   * @param args - Arguments to format
   * @returns Formatted arguments string
   */
  private formatArgumentsForManifest(args: any[]): string {
    if (!args || args.length === 0) {
      return "";
    }

    return args
      .map((arg) => {
        if (typeof arg === "string") {
          // Check if it's an address
          if (
            arg.startsWith("account_") ||
            arg.startsWith("resource_") ||
            arg.startsWith("component_") ||
            arg.startsWith("package_")
          ) {
            return `Address("${arg}")`;
          }
          // Regular string
          return `"${arg}"`;
        } else if (typeof arg === "number") {
          if (Number.isInteger(arg)) {
            return `${arg}`;
          } else {
            return `Decimal("${arg}")`;
          }
        } else if (typeof arg === "boolean") {
          return arg ? "true" : "false";
        } else if (Array.isArray(arg)) {
          // Handle arrays
          const arrayItems = arg
            .map((item) => this.formatSingleArgument(item))
            .join(", ");
          return `Array<${this.determineArrayType(arg)}>(${arrayItems})`;
        } else if (arg === null || arg === undefined) {
          return "Null()";
        } else if (typeof arg === "object") {
          // Handle objects as maps
          const entries = Object.entries(arg)
            .map(
              ([key, value]) =>
                `"${key}" => ${this.formatSingleArgument(value)}`
            )
            .join(", ");
          return `Map<String, ${this.determineMapValueType(arg)}>(${entries})`;
        }

        // Default case
        return `"${arg}"`;
      })
      .join("\n          ");
  }

  /**
   * Format a single argument for the manifest
   *
   * @param arg - Argument to format
   * @returns Formatted argument string
   */
  private formatSingleArgument(arg: any): string {
    if (typeof arg === "string") {
      // Check if it's an address
      if (
        arg.startsWith("account_") ||
        arg.startsWith("resource_") ||
        arg.startsWith("component_") ||
        arg.startsWith("package_")
      ) {
        return `Address("${arg}")`;
      }
      // Regular string
      return `"${arg}"`;
    } else if (typeof arg === "number") {
      if (Number.isInteger(arg)) {
        return `${arg}`;
      } else {
        return `Decimal("${arg}")`;
      }
    } else if (typeof arg === "boolean") {
      return arg ? "true" : "false";
    } else if (Array.isArray(arg)) {
      const arrayItems = arg
        .map((item) => this.formatSingleArgument(item))
        .join(", ");
      return `Array<${this.determineArrayType(arg)}>(${arrayItems})`;
    } else if (arg === null || arg === undefined) {
      return "Null()";
    } else if (typeof arg === "object") {
      const entries = Object.entries(arg)
        .map(
          ([key, value]) => `"${key}" => ${this.formatSingleArgument(value)}`
        )
        .join(", ");
      return `Map<String, ${this.determineMapValueType(arg)}>(${entries})`;
    }

    // Default case
    return `"${arg}"`;
  }

  /**
   * Determine the type of array elements
   *
   * @param arr - Array to determine type for
   * @returns Type string
   */
  private determineArrayType(arr: any[]): string {
    if (arr.length === 0) {
      return "Any";
    }

    const firstItem = arr[0];
    if (typeof firstItem === "string") {
      return "String";
    } else if (typeof firstItem === "number") {
      if (Number.isInteger(firstItem)) {
        return "u32";
      } else {
        return "Decimal";
      }
    } else if (typeof firstItem === "boolean") {
      return "bool";
    } else if (Array.isArray(firstItem)) {
      return `Array<${this.determineArrayType(firstItem)}>`;
    } else if (typeof firstItem === "object") {
      return "Map";
    }

    return "Any";
  }

  /**
   * Determine the type of map values
   *
   * @param obj - Object to determine value type for
   * @returns Type string
   */
  private determineMapValueType(obj: Record<string, any>): string {
    const values = Object.values(obj);
    if (values.length === 0) {
      return "Any";
    }

    const firstValue = values[0];
    if (typeof firstValue === "string") {
      return "String";
    } else if (typeof firstValue === "number") {
      if (Number.isInteger(firstValue)) {
        return "u32";
      } else {
        return "Decimal";
      }
    } else if (typeof firstValue === "boolean") {
      return "bool";
    } else if (Array.isArray(firstValue)) {
      return `Array<${this.determineArrayType(firstValue)}>`;
    } else if (typeof firstValue === "object") {
      return "Map";
    }

    return "Any";
  }
}
