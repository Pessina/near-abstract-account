import { type WalletClient, custom, createWalletClient } from "viem";

// Define types locally that mirror the Rust structs
interface Signature {
  r: string;
  s: string; 
  v: string;
}

interface EthereumData {
  message: string;
  signature: Signature;
}

export class Ethereum {
  private static walletClient: WalletClient | null = null;

  private static getWalletClient(): WalletClient {
    if (!window.ethereum) {
      throw new Error("Ethereum is not available in this browser");
    }
    
    if (!this.walletClient) {
      this.walletClient = createWalletClient({
        transport: custom(window.ethereum)
      });
    }

    return this.walletClient;
  }

  public static isSupportedByBrowser(): boolean {
    return typeof window !== "undefined" && window.ethereum !== undefined;
  }

  public static async requestAccounts(): Promise<`0x${string}`[]> {
    if (!this.isSupportedByBrowser()) {
      throw new Error("Ethereum is not supported by this browser");
    }

    try {
      const client = this.getWalletClient();
      return await client.requestAddresses();
    } catch (error) {
      console.error("Error requesting accounts:", error);
      throw error;
    }
  }

  public static async signMessage(
    message: string,
    address: `0x${string}`
  ): Promise<EthereumData | null> {
    if (!this.isSupportedByBrowser()) {
      return null;
    }

    try {
      const client = this.getWalletClient();
      const signature = await client.signMessage({
        account: address,
        message
      });

      if (!signature) {
        return null;
      }

      // Split signature into r, s, v components
      const r = `0x${signature.slice(2, 66)}`;
      const s = `0x${signature.slice(66, 130)}`;
      const v = `0x${signature.slice(130, 132)}`;

      return {
        message,
        signature: {
          r,
          s,
          v,
        },
      };
    } catch (error) {
      console.error("Error signing message:", error);
      return null;
    }
  }

  public static async getCurrentAddress(): Promise<`0x${string}` | null> {
    if (!this.isSupportedByBrowser()) {
      return null;
    }

    try {
      const client = this.getWalletClient();
      const [address] = await client.getAddresses();
      return address || null;
    } catch (error) {
      console.error("Error getting current address:", error);
      return null;
    }
  }
}


