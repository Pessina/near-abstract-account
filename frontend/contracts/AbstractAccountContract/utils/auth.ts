import { AuthIdentity } from "../AbstractAccountContract";
import {
  OIDCAuthIdentity,
  WalletAuthIdentity,
  WebAuthnAuthIdentity,
} from "../types/auth";
import { Transaction } from "../types/transaction";

export class AbstractAccountContractBuilder {
  static authIdentity = {
    webauthn: (
      args: WebAuthnAuthIdentity["WebAuthn"]
    ): WebAuthnAuthIdentity => ({
      WebAuthn: {
        key_id: args.key_id,
        compressed_public_key: args.compressed_public_key,
      },
    }),

    wallet: (args: WalletAuthIdentity["Wallet"]): WalletAuthIdentity => ({
      Wallet: {
        wallet_type: args.wallet_type,
        public_key: args.public_key,
      },
    }),

    oidc: (args: OIDCAuthIdentity["OIDC"]): OIDCAuthIdentity => ({
      OIDC: {
        client_id: args.client_id,
        issuer: args.issuer,
        email: args.email,
      },
    }),
  };

  static transaction = {
    addAuthIdentity: (args: { authIdentity: AuthIdentity }): Transaction => ({
      AddAuthIdentity: args.authIdentity,
    }),

    removeAuthIdentity: (args: {
      authIdentity: AuthIdentity;
    }): Transaction => ({
      RemoveAuthIdentity: args.authIdentity,
    }),

    removeAccount: (): Transaction => "RemoveAccount",

    sign: (args: {
      contractId: string;
      payloads: Array<{
        payload: number[];
        path: string;
        key_version: number;
      }>;
    }): Transaction => ({
      Sign: {
        contract_id: args.contractId,
        payloads: args.payloads,
      },
    }),
  };
}
