export interface OIDCAuthIdentity {
  OIDC: {
    client_id: string;
    issuer: string;
    email: string;
  };
}

export interface OIDCAuthData {
  token: string;
}
