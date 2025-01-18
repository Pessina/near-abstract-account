import { AuthIdentity } from "../AbstractAccountContract";
import { WalletType } from "../types/auth";
import { Transaction } from "../types/transaction";

export class AuthBuilder {
  static auth = {
    webauthn: (args: {
      keyId: string;
      compressedPublicKey: string;
    }): AuthIdentity => ({
      WebAuthn: {
        key_id: args.keyId,
        compressed_public_key: args.compressedPublicKey,
      },
    }),

    wallet: (args: {
      walletType: WalletType;
      publicKey: string;
    }): AuthIdentity => ({
      Wallet: {
        wallet_type: args.walletType,
        public_key: args.publicKey,
      },
    }),

    oidc: (args: {
      clientId: string;
      issuer: string;
      email: string;
    }): AuthIdentity => ({
      OIDC: {
        client_id: args.clientId,
        issuer: args.issuer,
        email: args.email,
      },
    }),

    account: (args: { accountId: string }): AuthIdentity => ({
      Account: args.accountId,
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

    removeAccount: (): Transaction => ({
      RemoveAccount: null,
    }),

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
