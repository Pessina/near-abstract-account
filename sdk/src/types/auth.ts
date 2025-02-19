// At least one of email or sub has to be provided
export interface OIDCIdentity {
  OIDC: {
    client_id: string
    issuer: string
    email: string | null
    sub: string | null
  }
}

export interface OIDCCredentials {
  token: string
}

export interface WebAuthnIdentity {
  WebAuthn: {
    key_id: string
    compressed_public_key?: string
  }
}

export interface WebAuthnCredentials {
  signature: string
  authenticator_data: string
  client_data: string
}

export enum WalletType {
  Ethereum = 'Ethereum',
  Solana = 'Solana',
}

export interface WalletIdentity {
  Wallet: {
    wallet_type: WalletType
    public_key: string
  }
}

export interface WalletCredentials {
  signature: string
}
