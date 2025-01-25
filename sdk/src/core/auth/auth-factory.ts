import {
  OIDCAuthenticator,
  WebAuthnAuthenticator,
  WalletAuthenticator,
  AccountAuthenticator,
  WalletType,
} from '../../types/auth'

export class AuthFactory {
  static createOIDC(
    clientId: string,
    issuer: string,
    email?: string,
    sub?: string
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

  static createWebAuthn(
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

  static createWallet(
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

  static createAccount(accountId: string): AccountAuthenticator {
    return {
      Account: accountId,
    }
  }
}
