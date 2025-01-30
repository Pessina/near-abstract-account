import type { Identity, IdentityWithPermissions } from '../types/account'
import type {
  WebAuthnIdentity,
  WalletIdentity,
  OIDCIdentity,
} from '../types/auth'
import type {
  Credentials,
  SignPayloadsRequest,
  Transaction,
} from '../types/user-operation'

export class AbstractAccountContractBuilder {
  static identity = {
    webauthn: (args: WebAuthnIdentity['WebAuthn']): Identity => ({
      WebAuthn: args,
    }),

    wallet: (args: WalletIdentity['Wallet']): Identity => ({
      Wallet: args,
    }),

    oidc: (args: OIDCIdentity['OIDC']): Identity => ({
      OIDC: args,
    }),

    account: (accountId: string): Identity => ({
      Account: accountId,
    }),
  }
  static transaction = {
    /**
     * Add identity and default to enable_act_as false
     */
    addIdentity: (args: {
      accountId: string
      nonce: number
      identity_with_permissions: IdentityWithPermissions
    }): Transaction => ({
      account_id: args.accountId,
      nonce: args.nonce,
      action: {
        AddIdentity: args.identity_with_permissions,
      },
    }),

    addIdentityWithAuth: (args: {
      accountId: string
      nonce: number
      auth: {
        identity_with_permissions: IdentityWithPermissions
        credentials: Credentials
      }
    }): Transaction => ({
      account_id: args.accountId,
      nonce: args.nonce,
      action: {
        AddIdentityWithAuth: args.auth,
      },
    }),

    removeIdentity: (args: {
      accountId: string
      nonce: number
      identity: Identity
    }): Transaction => ({
      account_id: args.accountId,
      nonce: args.nonce,
      action: {
        RemoveIdentity: args.identity,
      },
    }),

    removeAccount: (args: {
      accountId: string
      nonce: number
    }): Transaction => ({
      account_id: args.accountId,
      nonce: args.nonce,
      action: 'RemoveAccount',
    }),

    sign: (args: {
      accountId: string
      nonce: number
      payloads: SignPayloadsRequest
    }): Transaction => ({
      account_id: args.accountId,
      nonce: args.nonce,
      action: {
        Sign: args.payloads,
      },
    }),
  }

  //   TODO: This methods will be responsible to generate the path for each Identity, those methods exist on the interface on Rust
  //   static path = {
  //     auth: (args: { user_op: UserOperation }): Transaction => ({
  //       account_id: args.accountId,
  //       nonce: args.nonce,
  //       action: 'Auth',
  //     }),
  //   }

  //   TODO: This methods will be responsible to generating the payload of the credentials on Transaction and AddIdentityWithAuth
  //   static credentialsPayload = {
  //     oidc: (args: OIDCCredentials): Credentials => ({
  //       OIDC: args,
  //     }),
  //   }

  //   TODO: This methods will be responsible to generate the @near-js/transactions Action type, possibly inject the nonce on the action also
  // static near = {
  //     buildAction:
  // }
}
