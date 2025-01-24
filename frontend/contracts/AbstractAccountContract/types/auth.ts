export interface OIDCCredentials {
  token: string;
}

// At least one of email or sub must be provided
export interface OIDCAuthenticator {
  OIDC: {
    client_id: string;
    issuer: string;
    email: string | null;
    sub: string | null;
  };
}

export interface WebAuthnCredentials {
  signature: string;
  authenticator_data: string;
  client_data: string;
}

export interface WebAuthnAuthenticator {
  WebAuthn: {
    key_id: string;
    compressed_public_key?: string;
  };
}

export enum WalletType {
  Ethereum = "Ethereum",
  Solana = "Solana",
}

export interface WalletAuthenticator {
  Wallet: {
    wallet_type: WalletType;
    public_key: string;
  };
}

export interface WalletCredentials {
  signature: string;
}
