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

export class Ethereum extends AuthIdentity<
  WalletAuthIdentity,
  WalletCredentials
> {
  private walletClient: WalletClient | null = null;

  private getProvider(): EIP1193Provider {
    if (!window.ethereum) {
      throw new Error("Ethereum provider not found. Please install MetaMask.");
    }
    return window.ethereum;
  }

  private async getWalletClient(): Promise<WalletClient> {
    const provider = this.getProvider();
    await provider.request({ method: "eth_requestAccounts" });

    if (!this.walletClient) {
      this.walletClient = createWalletClient({
        transport: custom(provider),
      });
    }

    return this.walletClient;
  }

  async getAuthIdentity(args?: {
    signature?: string;
    message?: string;
  }): Promise<WalletAuthIdentity> {
    let recoveredSignature: string;
    let signedMessage: string;

    if (!args?.signature || !args?.message) {
      const client = await this.getWalletClient();
      const [address] = await client.getAddresses();
      signedMessage = "Get public key";
      recoveredSignature = await client.signMessage({
        account: address,
        message: signedMessage,
      });
    } else {
      recoveredSignature = args.signature;
      signedMessage = args.message;
    }

    const preparedMessage = `\x19Ethereum Signed Message:\n${signedMessage.length}${signedMessage}`;
    const msgHash = keccak256(toBytes(preparedMessage));
    const uncompressedKey = await recoverPublicKey({
      hash: msgHash,
      signature: recoveredSignature as Hex,
    });

    const yValue = uncompressedKey.slice(-64);
    const yLastByte = parseInt(yValue.slice(-2), 16);
    const prefix = yLastByte % 2 === 0 ? "02" : "03";
    const compressedKey = "0x" + prefix + uncompressedKey.slice(4, 68);

    return AbstractAccountContractBuilder.authIdentity.wallet({
      wallet_type: AuthIdentityWalletType.Ethereum,
      public_key: compressedKey,
    });
  }

  async sign(message: string): Promise<{
    authIdentity: WalletAuthIdentity;
    credentials: WalletCredentials;
  }> {
    const client = await this.getWalletClient();
    const [address] = await client.getAddresses();
    const signature = await client.signMessage({
      account: address,
      message,
    });

    const authIdentity = await this.getAuthIdentity({
      signature,
      message,
    });

    return {
      authIdentity,
      credentials: {
        signature,
      },
    };
  }
}
