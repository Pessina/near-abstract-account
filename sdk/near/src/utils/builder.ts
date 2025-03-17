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
import { bytesToHex, hexToBytes, isAddress, keccak256, type Hex } from 'viem'

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

  static path = {
    getPath: (identity: Identity): string => {
      if ('Wallet' in identity) {
        const wallet = identity.Wallet
        if (wallet.wallet_type === 'Ethereum') {
          const address =
            '0x' +
            keccak256((`0x` + wallet.public_key.slice(4)) as Hex).slice(-40)
          if (!isAddress(address))
            throw new Error('Failed to derive valid address')
          return `wallet/${address}`
        }
        return `wallet/${wallet.public_key}`
      }

      if ('WebAuthn' in identity) {
        return `webauthn/${identity.WebAuthn.compressed_public_key}`
      }

      if ('OIDC' in identity) {
        const { OIDC: oidc } = identity
        if (!oidc.email && !oidc.sub)
          throw new Error('OIDC auth identity must have either email or sub')
        const identifier = oidc.sub || oidc.email
        return `oidc/${oidc.issuer}/${oidc.client_id}/${identifier}`
      }

      throw new Error('Unknown identity type')
    },
  }
}
