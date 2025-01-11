export interface OIDCAuthIdentity {
  client_id: string;
  issuer: string;
  email: string;
}

export interface OIDCAuthData {
  token: string;
}
