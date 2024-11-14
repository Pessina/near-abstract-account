import {
  type WalletClient,
  type EIP1193Provider,
  custom,
  createWalletClient,
  Hex,
  recoverPublicKey,
  keccak256,
  toBytes,
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
    message: string
  ): Promise<EthereumAuthData | null> {
    if (!this.isSupportedByBrowser()) {
      return null;
    }

    try {
      const client = await this.getWalletClient();
      const [address] = await client.getAddresses();
      const signature = await client.signMessage({
        account: address,
        message,
      });

      if (!signature) {
        return null;
      }

      return {
        message,
        signature,
      };
    } catch (error) {
      console.error("Error signing message:", error);
      return null;
    }
  }

  public static async getCompressedPublicKey(
    message?: string,
    signature?: string
  ): Promise<string | null> {
    if (!this.isSupportedByBrowser()) {
      return null;
    }

    try {
      let finalMessage = message;
      let finalSignature = signature;

      if (!finalMessage || !finalSignature) {
        const client = await this.getWalletClient();
        const [address] = await client.getAddresses();

        if (!address) {
          return null;
        }

        finalMessage = "Get public key";
        const sig = await client.signMessage({
          account: address,
          message: finalMessage,
        });

        if (!sig) {
          return null;
        }

        finalSignature = sig;
      }

      const preparedMessage = `\x19Ethereum Signed Message:\n${finalMessage.length}${finalMessage}`;
      const msgHash = keccak256(toBytes(preparedMessage));
      const uncompressedKey = await recoverPublicKey({
        hash: msgHash,
        signature: finalSignature as Hex,
      });

      const yValue = uncompressedKey.slice(-64);
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
