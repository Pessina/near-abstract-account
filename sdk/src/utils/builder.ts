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
import { isAddress, keccak256 } from 'viem'

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
      if (args.walletType === 'Ethereum') {
        const key = args.publicKey.startsWith('0x')
          ? args.publicKey.slice(2)
          : args.publicKey
        try {
          if (key.length % 2 !== 0) throw new Error('Invalid hex string length')
          const pubKeyBytes = Buffer.from(key, 'hex')
          if (pubKeyBytes.length !== 33 && pubKeyBytes.length !== 65)
            throw new Error('Public key must be 33 or 65 bytes')
          // Always drop the first byte, as in the Rust implementation.
          const keyToHash = pubKeyBytes.slice(1)
          const keyToHashHex = '0x' + keyToHash.toString('hex')
          const hash = keccak256(keyToHashHex as `0x${string}`)
          // Take the last 20 bytes (40 hex characters) from the 32-byte hash.
          const address = '0x' + hash.slice(-40)
          if (!isAddress(address))
            throw new Error('Failed to derive valid address')
          return `wallet/${address}`
        } catch (err) {
          throw new Error(
            `Invalid Ethereum public key: ${(err as Error).message}`
          )
        }
      }
      return `wallet/${args.publicKey}`
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
