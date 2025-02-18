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

  // TODO: This could likely be exposed by the contract to avoid code duplication
  static path = {
    wallet: (args: {
      walletType: 'Ethereum' | 'Solana'
      publicKey: string
    }): string => {
      const path =
        args.walletType === 'Ethereum'
          ? args.publicKey.startsWith('0x')
            ? args.publicKey.slice(2)
            : args.publicKey
          : args.publicKey

      return `wallet/${path}`
    },

    webauthn: (args: { compressedPublicKey: string }): string => {
      return `webauthn/${args.compressedPublicKey}`
    },

    oidc: (args: {
      issuer: string
      clientId: string
      email?: string
      sub?: string
    }): string => {
      if (!args.email && !args.sub) {
        throw new Error('OIDC auth identity must have either email or sub')
      }

      const identifier = args.sub || args.email
      return `oidc/${args.issuer}/${args.clientId}/${identifier}`
    },
  }
}
