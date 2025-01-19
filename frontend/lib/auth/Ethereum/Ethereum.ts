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
import { AuthIdentity } from "../AuthIdentity";
import {
  WalletAuthIdentity,
  WalletCredentials,
  WalletType as AuthIdentityWalletType,
} from "@/contracts/AbstractAccountContract/types/auth";
import { AbstractAccountContractBuilder } from "@/contracts/AbstractAccountContract/utils/auth";

export type WalletType = "metamask" | "okx";

export class Ethereum extends AuthIdentity<
  WalletAuthIdentity,
  WalletCredentials
> {
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

  async getAuthIdentity(): Promise<WalletAuthIdentity> {
    const compressedPublicKey = await Ethereum.getCompressedPublicKey();

    return AbstractAccountContractBuilder.authIdentity.wallet({
      wallet_type: AuthIdentityWalletType.Ethereum,
      public_key: compressedPublicKey,
    });
  }

  async sign(message: string): Promise<WalletCredentials> {
    const client = await Ethereum.getWalletClient();
    const [address] = await client.getAddresses();
    const signature = await client.signMessage({
      account: address,
      message,
    });

    return {
      signature,
    };
  }

  private static async getCompressedPublicKey(
    message?: string,
    signature?: string
  ): Promise<string> {
    let finalMessage = message;
    let finalSignature = signature;

    if (!finalMessage || !finalSignature) {
      const client = await this.getWalletClient();
      const [address] = await client.getAddresses();

      finalMessage = "Get public key";
      const sig = await client.signMessage({
        account: address,
        message: finalMessage,
      });

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
  }
}
