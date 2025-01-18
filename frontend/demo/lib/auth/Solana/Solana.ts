import type { BaseMessageSignerWalletAdapter } from "@solana/wallet-adapter-base";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { AuthIdentity } from "../AuthIdentity";
import {
  WalletAuthIdentity,
  WalletCredentials,
  WalletType as AuthIdentityWalletType,
} from "@/contracts/AbstractAccountContract/types/auth";

export type SolanaWalletType = "phantom" | "solflare";

export class Solana extends AuthIdentity<
  WalletAuthIdentity,
  WalletCredentials
> {
  private static wallet: BaseMessageSignerWalletAdapter | null = null;
  private static selectedWallet: SolanaWalletType | null = null;

  private static readonly WALLET_ADAPTERS = {
    phantom: () => new PhantomWalletAdapter(),
    solflare: () => new SolflareWalletAdapter(),
  } as const;

  private static readonly WALLET_DETECTORS = {
    phantom: () => window?.solana?.isPhantom ?? false,
    solflare: () => window?.solflare?.isSolflare ?? false,
  } as const;

  public static setWallet(type: SolanaWalletType): void {
    this.selectedWallet = type;
    this.wallet = null;
  }

  private static async getWallet(): Promise<BaseMessageSignerWalletAdapter> {
    if (!this.selectedWallet) {
      throw new Error("No wallet selected. Call setWallet() first");
    }

    if (!this.wallet) {
      const adapter = this.WALLET_ADAPTERS[this.selectedWallet];
      this.wallet = adapter();
    }

    if (!this.wallet.connected) {
      try {
        await this.wallet.connect();
      } catch (error) {
        this.wallet = null;
        throw new Error(
          `Failed to connect to ${this.selectedWallet}: ${error}`
        );
      }
    }

    return this.wallet;
  }

  private static isAvailable(): boolean {
    if (typeof window === "undefined") return false;
    if (!this.selectedWallet) return false;

    const detector = this.WALLET_DETECTORS[this.selectedWallet];
    return detector();
  }

  public async getAuthIdentity(): Promise<WalletAuthIdentity | null> {
    if (!Solana.isAvailable()) return null;

    try {
      const wallet = await Solana.getWallet();
      return {
        Wallet: {
          wallet_type: AuthIdentityWalletType.Solana,
          public_key: wallet.publicKey?.toBase58() ?? "",
        },
      };
    } catch {
      return null;
    }
  }

  public async sign(message: string): Promise<WalletCredentials | null> {
    if (!Solana.isAvailable()) return null;

    try {
      const wallet = await Solana.getWallet();
      if (!wallet.publicKey) throw new Error("Wallet not connected");

      const encodedMessage = new TextEncoder().encode(message);
      const signature = await wallet.signMessage(encodedMessage);

      return {
        signature: Buffer.from(signature).toString("base64"),
      };
    } catch (error) {
      console.error("Failed to sign message:", error);
      return null;
    }
  }
}
