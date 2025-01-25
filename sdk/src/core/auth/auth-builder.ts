import {
  OIDCAuthenticator,
  WebAuthnAuthenticator,
  WalletAuthenticator,
  AccountAuthenticator,
  WalletType,
} from '../../types/auth'

export class AuthBuilder {
  static oidc(
    clientId: string,
    issuer: string,
    { email, sub }: { email?: string; sub?: string } = {}
  ): OIDCAuthenticator {
    return {
      OIDC: {
        client_id: clientId,
        issuer,
        email: email || null,
        sub: sub || null,
      },
    }
  }

  static webauthn(
    keyId: string,
    compressedPublicKey?: string
  ): WebAuthnAuthenticator {
    return {
      WebAuthn: {
        key_id: keyId,
        compressed_public_key: compressedPublicKey,
      },
    }
  }

  static wallet(
    walletType: WalletType,
    publicKey: string
  ): WalletAuthenticator {
    return {
      Wallet: {
        wallet_type: walletType,
        public_key: publicKey,
      },
    }
  }

  static account(accountId: string): AccountAuthenticator {
    return { Account: accountId }
  }
}
