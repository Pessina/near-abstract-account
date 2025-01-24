import {
  AuthIdentity,
  IdentityPermissions,
  Transaction,
} from "../AbstractAccountContract";
import {
  OIDCAuthenticator,
  WalletAuthenticator,
  WebAuthnAuthenticator,
} from "../types/auth";
import { Credentials, SignPayloadsRequest } from "../types/transaction";

export class AbstractAccountContractBuilder {
  static authIdentity = {
    webauthn: (
      args: WebAuthnAuthenticator["WebAuthn"],
      permissions: IdentityPermissions
    ): AuthIdentity => ({
      authenticator: {
        WebAuthn: args,
      },
      permissions,
    }),

    wallet: (
      args: WalletAuthenticator["Wallet"],
      permissions: IdentityPermissions
    ): AuthIdentity => ({
      authenticator: {
        Wallet: args,
      },
      permissions,
    }),

    oidc: (
      args: OIDCAuthenticator["OIDC"],
      permissions: IdentityPermissions
    ): AuthIdentity => ({
      authenticator: {
        OIDC: args,
      },
      permissions,
    }),

    account: (
      accountId: string,
      permissions: IdentityPermissions
    ): AuthIdentity => ({
      authenticator: {
        Account: accountId,
      },
      permissions,
    }),
  };
  static transaction = {
    addAuthIdentity: (args: {
      accountId: string;
      nonce: string;
      auth: { auth_identity: AuthIdentity; credentials: Credentials };
    }): Transaction => ({
      account_id: args.accountId,
      nonce: args.nonce,
      action: {
        AddAuthIdentity: args.auth,
      },
    }),

    removeAuthIdentity: (args: {
      accountId: string;
      nonce: string;
      authIdentity: AuthIdentity;
    }): Transaction => ({
      account_id: args.accountId,
      nonce: args.nonce,
      action: {
        RemoveAuthIdentity: args.authIdentity,
      },
    }),

    removeAccount: (args: {
      accountId: string;
      nonce: string;
    }): Transaction => ({
      account_id: args.accountId,
      nonce: args.nonce,
      action: "RemoveAccount",
    }),

    sign: (args: {
      accountId: string;
      nonce: string;
      contractId: string;
      payloads: Array<SignPayloadsRequest>;
    }): Transaction => ({
      account_id: args.accountId,
      nonce: args.nonce,
      action: {
        Sign: {
          contract_id: args.contractId,
          payloads: args.payloads,
        },
      },
    }),
  };
}
