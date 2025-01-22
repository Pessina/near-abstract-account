import { Transaction } from "@/contracts/AbstractAccountContract/types/transaction";
import { WebAuthn } from "@/lib/auth/WebAuthn/WebAuthn";
import { Ethereum } from "@/lib/auth/Ethereum/Ethereum";
import { Solana } from "@/lib/auth/Solana/Solana";
import { AbstractAccountContractBuilder } from "@/contracts/AbstractAccountContract/utils/auth";
import {
  WalletAuthIdentity,
  WalletCredentials,
  WebAuthnAuthIdentity,
  WebAuthnCredentials,
  OIDCAuthIdentity,
  OIDCCredentials,
} from "@/contracts/AbstractAccountContract/types/auth";
import canonicalize from "canonicalize";

type EthereumWalletType = "metamask" | "okx";
type SolanaWalletType = "phantom" | "solflare";

type WalletConfig =
  | { type: "ethereum"; wallet: EthereumWalletType }
  | { type: "solana"; wallet: SolanaWalletType };

type OIDCConfig = {
  clientId: string;
  issuer: string;
  email: string | null;
  sub: string | null;
  token?: string;
};

type WebAuthnConfig = {
  username: string;
};

export type AuthConfig =
  | { type: "wallet"; config: WalletConfig }
  | { type: "webauthn"; config: WebAuthnConfig }
  | { type: "oidc"; config: OIDCConfig };

export class AuthAdapter {
  private static getWalletInstance(config: WalletConfig) {
    if (config.type === "ethereum") {
      const ethereum = new Ethereum();
      return ethereum;
    } else {
      const solana = new Solana(config.wallet);
      return solana;
    }
  }

  static async getAuthIdentity(
    config: AuthConfig
  ): Promise<WalletAuthIdentity | WebAuthnAuthIdentity | OIDCAuthIdentity> {
    switch (config.type) {
      case "wallet": {
        const wallet = this.getWalletInstance(config.config);
        const authIdentity = await wallet.getAuthIdentity();
        if (!authIdentity)
          throw new Error("Failed to get wallet auth identity");
        return authIdentity;
      }
      case "webauthn": {
        const webAuthn = new WebAuthn();
        const authIdentity = await webAuthn.getAuthIdentity({
          id: config.config.username,
        });
        if (!authIdentity)
          throw new Error("Failed to get WebAuthn auth identity");
        return authIdentity;
      }
      case "oidc": {
        return AbstractAccountContractBuilder.authIdentity.oidc({
          client_id: config.config.clientId,
          issuer: config.config.issuer,
          email: config.config.email,
          sub: config.config.sub,
        });
      }
    }
  }

  static async sign(
    message: Transaction,
    config: AuthConfig
  ): Promise<
    | {
        credentials: WalletCredentials;
        authIdentity: WalletAuthIdentity;
      }
    | {
        credentials: WebAuthnCredentials;
        authIdentity: WebAuthnAuthIdentity;
      }
    | {
        credentials: OIDCCredentials;
        authIdentity: OIDCAuthIdentity;
      }
  > {
    const canonical = canonicalize(message);
    if (!canonical) {
      throw new Error("Failed to canonicalize message");
    }

    switch (config.type) {
      case "wallet": {
        const wallet = this.getWalletInstance(config.config);
        return wallet.sign(canonical);
      }
      case "webauthn": {
        const webAuthn = new WebAuthn();
        return webAuthn.sign(canonical);
      }
      case "oidc": {
        if (!config.config.token) throw new Error("Token is required");

        return {
          authIdentity: AbstractAccountContractBuilder.authIdentity.oidc({
            client_id: config.config.clientId,
            issuer: config.config.issuer,
            email: config.config.email,
            sub: config.config.sub,
          }),
          credentials: {
            token: config.config.token,
          },
        };
      }
    }
  }
}
