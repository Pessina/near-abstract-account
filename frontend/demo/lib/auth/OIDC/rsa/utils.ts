import { Buffer } from "buffer";

export interface JWTHeader {
  alg: string;
  kid: string;
  typ: string;
}

export interface JWTPayload {
  iss: string;
  azp: string;
  aud: string;
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
  iat: number;
  exp: number;
  jti: string;
}

interface JWK {
  kid: string;
  n: string;
  e: string;
  alg: string;
  kty: string;
  use: string;
}

interface GoogleCertsResponse {
  keys: JWK[];
}

/**
 * Decodes and validates JWT token parts
 */
export async function decodeAndValidateToken(token: string): Promise<{
  header: JWTHeader;
  payload: JWTPayload;
  signatureB64: string;
  // signedData: Uint8Array;
  signedData: string;
}> {
  // Split token into parts
  const [headerB64, payloadB64, signatureB64] = token.split(".");

  if (!headerB64 || !payloadB64 || !signatureB64) {
    throw new Error("Invalid token format");
  }

  // Decode header and payload
  const header = JSON.parse(
    Buffer.from(headerB64, "base64").toString()
  ) as JWTHeader;

  const payload = JSON.parse(
    Buffer.from(payloadB64, "base64").toString()
  ) as JWTPayload;

  // // Verify token hasn't expired
  // const now = Math.floor(Date.now() / 1000);
  // if (payload.exp < now) {
  //   throw new Error("Token has expired");
  // }

  // const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signedData = `${headerB64}.${payloadB64}`;

  console.log("signedData", signedData);

  return {
    header,
    payload,
    signatureB64,
    signedData,
  };
}

/**
 * Fetches Google's public keys and finds matching key
 */
export async function fetchMatchingPublicKey(kid: string): Promise<JWK> {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/certs");
  const keys = (await response.json()) as GoogleCertsResponse;

  // Find matching key
  const key = keys.keys.find((k) => k.kid === kid);
  if (!key) {
    throw new Error("No matching key found");
  }

  return key;
}

/**
 * Converts JWK to CryptoKey
 */
export async function importPublicKey(jwk: JWK): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    true,
    ["verify"]
  );
}

/**
 * Verifies RSA signature
 */
export async function verifySignature(
  publicKey: CryptoKey,
  signatureB64: string,
  signedData: Uint8Array
): Promise<boolean> {
  const signatureBytes = Uint8Array.from(Buffer.from(signatureB64, "base64"));

  return await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    publicKey,
    signatureBytes,
    signedData
  );
}
