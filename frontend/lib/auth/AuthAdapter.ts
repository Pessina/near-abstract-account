import {
  WalletCredentials,
  WebAuthnCredentials,
  OIDCCredentials,
  AbstractAccountContractBuilder,
  Identity,
} from "chainsig-aa.js";

import { Ethereum } from "@/lib/auth/Ethereum/Ethereum";
import { Solana } from "@/lib/auth/Solana/Solana";
import { WebAuthn, WebAuthnOperation } from "@/lib/auth/WebAuthn/WebAuthn";

type EthereumWalletType = "metamask" | "okx";

type WalletConfig =
  | { type: "ethereum"; wallet: EthereumWalletType }
  | { type: "solana" };

type OIDCConfig = {
  clientId: string;
  issuer: string;
  email: string | null;
  sub: string | null;
  token?: string;
};

type WebAuthnConfig = {
  username: string;
  operation: WebAuthnOperation;
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
      const solana = new Solana();
      return solana;
    }
  }

  static async getIdentity(config: AuthConfig): Promise<Identity> {
    switch (config.type) {
      case "wallet": {
        const wallet = this.getWalletInstance(config.config);
        const authIdentity = await wallet.getIdentity();
        if (!authIdentity)
          throw new Error("Failed to get wallet auth AddIdentity");
        return authIdentity;
      }
      case "webauthn": {
        const webAuthn = new WebAuthn();
        const authIdentity = await webAuthn.getIdentity({
          id: config.config.username,
          operation: config.config.operation,
        });
        if (!authIdentity)
          throw new Error("Failed to get WebAuthn auth AddIdentity");
        return authIdentity;
      }
      case "oidc": {
        return AbstractAccountContractBuilder.identity.oidc({
          client_id: config.config.clientId,
          issuer: config.config.issuer,
          email: config.config.email,
          sub: config.config.sub,
        });
      }
    }
  }

  static async sign(
    message: string,
    config: AuthConfig
  ): Promise<
    | {
        credentials: WalletCredentials;
        authIdentity: Identity;
      }
    | {
        credentials: WebAuthnCredentials;
        authIdentity: Identity;
      }
    | {
        credentials: OIDCCredentials;
        authIdentity: Identity;
      }
  > {
    if (!message) {
      throw new Error("Failed to canonicalize message");
    }

    switch (config.type) {
      case "wallet": {
        const wallet = this.getWalletInstance(config.config);
        return wallet.sign(message);
      }
      case "webauthn": {
        const webAuthn = new WebAuthn();
        return webAuthn.sign(message);
      }
      case "oidc": {
        if (!config.config.token) throw new Error("Token is required");

        return {
          authIdentity: AbstractAccountContractBuilder.identity.oidc({
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
