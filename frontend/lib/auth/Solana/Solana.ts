import type { BaseMessageSignerWalletAdapter } from "@solana/wallet-adapter-base";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";

import { AuthIdentityClass } from "../AuthIdentity";

import { AuthIdentity } from "@/contracts/AbstractAccountContract/AbstractAccountContract";
import {
  WalletCredentials,
  WalletType as AuthIdentityWalletType,
} from "@/contracts/AbstractAccountContract/types/auth";
import { AbstractAccountContractBuilder } from "@/contracts/AbstractAccountContract/utils/auth";

export type SolanaWalletType = "phantom" | "solflare";

export class Solana extends AuthIdentityClass<AuthIdentity, WalletCredentials> {
  private wallet: BaseMessageSignerWalletAdapter | null = null;

  constructor(private walletType: SolanaWalletType) {
    super();
  }

  private async connectWallet(): Promise<BaseMessageSignerWalletAdapter> {
    if (!this.wallet) {
      const adapter =
        this.walletType === "phantom"
          ? new PhantomWalletAdapter()
          : new SolflareWalletAdapter();

      this.wallet = adapter;

      if (!this.wallet.connected) {
        try {
          await this.wallet.connect();
        } catch (error) {
          this.wallet = null;
          throw new Error(`Failed to connect to ${this.walletType}: ${error}`);
        }
      }
    }

    return this.wallet;
  }

  private isAvailable(): boolean {
    if (typeof window === "undefined") return false;

    return this.walletType === "phantom"
      ? window?.solana?.isPhantom ?? false
      : window?.solflare?.isSolflare ?? false;
  }

  public async getAuthIdentity(): Promise<AuthIdentity> {
    if (!this.isAvailable()) throw new Error("Solana wallet not available");

    const wallet = await this.connectWallet();
    return AbstractAccountContractBuilder.authIdentity.wallet(
      {
        wallet_type: AuthIdentityWalletType.Solana,
        public_key: wallet.publicKey?.toBase58() ?? "",
      },
      undefined
    );
  }

  public async sign(message: string): Promise<{
    authIdentity: AuthIdentity;
    credentials: WalletCredentials;
  }> {
    if (!this.isAvailable()) throw new Error("Solana wallet not available");

    const wallet = await this.connectWallet();
    if (!wallet.publicKey) throw new Error("Wallet not connected");

    const encodedMessage = new TextEncoder().encode(message);
    const signature = await wallet.signMessage(encodedMessage);
    const authIdentity = AbstractAccountContractBuilder.authIdentity.wallet(
      {
        wallet_type: AuthIdentityWalletType.Solana,
        public_key: wallet.publicKey?.toBase58() ?? "",
      },
      undefined
    );

    return {
      authIdentity,
      credentials: {
        signature: Buffer.from(signature).toString("base64"),
      },
    };
  }
}
