export interface OIDCCredentials {
  token: string;
}

export interface WebAuthnCredentials {
  signature: string;
  authenticator_data: string;
  client_data: string;
}

export interface WalletCredentials {
  signature: string;
}

export interface OIDCAuthIdentity {
  OIDC: {
    client_id: string;
    issuer: string;
    email: string;
  };
}

export interface WebAuthnAuthIdentity {
  WebAuthn: {
    key_id: string;
    compressed_public_key?: string;
  };
}

export enum WalletType {
  Ethereum = "Ethereum",
  Solana = "Solana",
}

export interface WalletAuthIdentity {
  Wallet: {
    wallet_type: WalletType;
    public_key: string;
  };
}
