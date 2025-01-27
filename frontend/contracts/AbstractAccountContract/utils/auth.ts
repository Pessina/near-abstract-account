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
    /**
     * Add identity and default to enable_act_as false
     */
    addIdentity: (args: {
      accountId: string;
      nonce: number;
      identity: Identity;
    }): Transaction => ({
      account_id: args.accountId,
      nonce: args.nonce,
      action: {
        AddIdentity: {
          identity: args.identity,
          permissions: {
            enable_act_as: false,
          },
        },
      },
    }),

    addIdentityWithAuth: (args: {
      accountId: string;
      nonce: number;
      auth: {
        identity_with_permissions: IdentityWithPermissions;
        credentials: Credentials;
      };
    }): Transaction => ({
      account_id: args.accountId,
      nonce: args.nonce,
      action: {
        AddIdentityWithAuth: {
          identity_with_permissions: args.auth.identity_with_permissions,
          credentials: args.auth.credentials,
        },
      },
    }),

    removeIdentity: (args: {
      accountId: string;
      nonce: number;
      identity: Identity;
    }): Transaction => ({
      account_id: args.accountId,
      nonce: args.nonce,
      action: {
        RemoveIdentity: args.identity,
      },
    }),

    removeAccount: (args: {
      accountId: string;
      nonce: number;
    }): Transaction => ({
      account_id: args.accountId,
      nonce: args.nonce,
      action: "RemoveAccount",
    }),

    sign: (args: {
      accountId: string;
      nonce: number;
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
