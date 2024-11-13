import {
  type WalletClient,
  type EIP1193Provider,
  custom,
  createWalletClient,
  Hex,
  hashMessage,
  recoverPublicKey,
} from "viem";
import { EthereumAuthData } from "./types";

export type WalletType = "metamask" | "okx";

export class Ethereum {
  private static walletClient: WalletClient | null = null;
  private static selectedWallet: WalletType | null = null;

  public static setWallet(wallet: WalletType) {
    this.selectedWallet = wallet;
  }

  private static getProvider(): EIP1193Provider {
    if (!this.selectedWallet) {
      throw new Error(
        "Please select a wallet using setWallet() before proceeding"
      );
    }

    if (this.selectedWallet === "okx" && window.okxwallet) {
      return window.okxwallet;
    }

    if (this.selectedWallet === "metamask" && window.ethereum) {
      return window.ethereum;
    }

    throw new Error(
      `${this.selectedWallet} wallet not found. Please install the wallet first`
    );
  }

  private static async getWalletClient(): Promise<WalletClient> {
    const provider = this.getProvider();

    // Request permission to access accounts first
    await provider.request({ method: "eth_requestAccounts" });

    if (!this.walletClient) {
      this.walletClient = createWalletClient({
        transport: custom(provider),
      });
    }

    return this.walletClient;
  }

  public static isSupportedByBrowser(): boolean {
    return (
      typeof window !== "undefined" &&
      (window.ethereum !== undefined || window.okxwallet !== undefined)
    );
  }

  // Rest of the methods remain the same
  public static async requestAccounts(): Promise<`0x${string}`[]> {
    if (!this.isSupportedByBrowser()) {
      throw new Error("No supported Ethereum wallet found");
    }

    try {
      const client = await this.getWalletClient();
      return await client.requestAddresses();
    } catch (error) {
      console.error("Error requesting accounts:", error);
      throw error;
    }
  }

  public static async signMessage(
    message: string,
    address: `0x${string}`
  ): Promise<EthereumAuthData | null> {
    if (!this.isSupportedByBrowser()) {
      return null;
    }

    try {
      const client = await this.getWalletClient();
      const signature = await client.signMessage({
        account: address,
        message,
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
      const client = await this.getWalletClient();
      const [address] = await client.getAddresses();
      return address || null;
    } catch (error) {
      console.error("Error getting current address:", error);
      return null;
    }
  }

  public static async getCompressedPublicKey(): Promise<string | null> {
    if (!this.isSupportedByBrowser()) {
      return null;
    }

    try {
      const client = await this.getWalletClient();
      const [address] = await client.getAddresses();

      if (!address) {
        return null;
      }

      // For Ethereum, we use the compressed public key format
      // This matches the format expected by the contract
      const message = "Get public key";
      const signature = await client.signMessage({
        account: address,
        message,
      });

      if (!signature) {
        return null;
      }

      // Recover public key from signature
      const msgHash = hashMessage(message);
      const uncompressedKey = await recoverPublicKey({
        hash: msgHash,
        signature: signature as Hex,
      });

      // Convert to compressed format by taking first 66 chars (0x + 32 bytes)
      // and setting the first byte after 0x to either 02 or 03 depending on y value
      const yValue = uncompressedKey.slice(-64); // Last 32 bytes
      const yLastByte = parseInt(yValue.slice(-2), 16);
      const prefix = yLastByte % 2 === 0 ? "02" : "03";
      const compressedKey = "0x" + prefix + uncompressedKey.slice(4, 68);

      return compressedKey;
    } catch (error) {
      console.error("Error getting public key:", error);
      return null;
    }
  }
}
