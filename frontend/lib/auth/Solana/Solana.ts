import type { BaseMessageSignerWalletAdapter } from "@solana/wallet-adapter-base";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import {
  WalletCredentials,
  WalletType,
  Identity,
  AbstractAccountContractBuilder,
} from "chainsig-aa.js";

import { IdentityClass } from "../Identity";

export type SolanaWalletType = "phantom" | "solflare";

export class Solana extends IdentityClass<Identity, WalletCredentials> {
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

  public async getIdentity(): Promise<Identity> {
    if (!this.isAvailable()) throw new Error("Solana wallet not available");

    const wallet = await this.connectWallet();
    return AbstractAccountContractBuilder.identity.wallet({
      wallet_type: WalletType.Solana,
      public_key: wallet.publicKey?.toBase58() ?? "",
    });
  }

  public async sign(message: string): Promise<{
    authIdentity: Identity;
    credentials: WalletCredentials;
  }> {
    if (!this.isAvailable()) throw new Error("Solana wallet not available");

    const wallet = await this.connectWallet();
    if (!wallet.publicKey) throw new Error("Wallet not connected");

    const encodedMessage = new TextEncoder().encode(message);
    const signature = await wallet.signMessage(encodedMessage);
    const authIdentity = AbstractAccountContractBuilder.identity.wallet({
      wallet_type: WalletType.Solana,
      public_key: wallet.publicKey?.toBase58() ?? "",
    });

    return {
      authIdentity,
      credentials: {
        signature: Buffer.from(signature).toString("base64"),
      },
    };
  }
}
