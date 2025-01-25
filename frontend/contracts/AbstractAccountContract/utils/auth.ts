import {
  OIDCAuthenticator,
  WalletAuthenticator,
  WebAuthnAuthenticator,
} from "../types/auth";
import {
  IdentityWithPermissions,
  Credentials,
  Identity,
  SignPayloadsRequest,
  Transaction,
} from "../types/transaction";

export class AbstractAccountContractBuilder {
  static authIdentity = {
    webauthn: (args: WebAuthnAuthenticator["WebAuthn"]): Identity => ({
      WebAuthn: args,
    }),

    wallet: (args: WalletAuthenticator["Wallet"]): Identity => ({
      Wallet: args,
    }),

    oidc: (args: OIDCAuthenticator["OIDC"]): Identity => ({
      OIDC: args,
    }),

    account: (accountId: string): Identity => ({
      Account: accountId,
    }),
  };
  static transaction = {
    addIdentityWithPermissions: (args: {
      accountId: string;
      nonce: string;
      auth: {
        identity: IdentityWithPermissions;
        credentials: Credentials;
      };
    }): Transaction => ({
      account_id: args.accountId,
      nonce: args.nonce,
      action: {
        AddIdentityWithAuth: {
          identity_with_permissions: args.auth.identity,
          credentials: args.auth.credentials,
        },
      },
    }),

    removeIdentityWithPermissions: (args: {
      accountId: string;
      nonce: string;
      authIdentity: IdentityWithPermissions;
    }): Transaction => ({
      account_id: args.accountId,
      nonce: args.nonce,
      action: {
        RemoveIdentity: args.authIdentity.identity,
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
      payloads: SignPayloadsRequest;
    }): Transaction => ({
      account_id: args.accountId,
      nonce: args.nonce,
      action: {
        Sign: args.payloads,
      },
    }),
  };
}
