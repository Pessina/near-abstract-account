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

export interface JWK {
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
 * Decodes a base64url-encoded string to a Buffer.
 * @param base64UrlString - The base64url-encoded string.
 * @returns The decoded Buffer.
 */
export function base64UrlDecode(base64UrlString: string): Buffer {
  let base64String = base64UrlString.replace(/-/g, "+").replace(/_/g, "/");
  while (base64String.length % 4 !== 0) {
    base64String += "=";
  }
  return Buffer.from(base64String, "base64");
}

/**
 * Decodes and validates JWT token parts.
 * @param token - The JWT token.
 * @returns The decoded header, payload, signature, and signed data.
 */
export async function decodeAndValidateToken(token: string): Promise<{
  header: JWTHeader;
  payload: JWTPayload;
  signatureB64: string;
  signedData: string;
}> {
  const [headerB64, payloadB64, signatureB64] = token.split(".");

  if (!headerB64 || !payloadB64 || !signatureB64) {
    throw new Error("Invalid token format");
  }

  const headerJson = base64UrlDecode(headerB64).toString("utf8");
  const header = JSON.parse(headerJson) as JWTHeader;

  const payloadJson = base64UrlDecode(payloadB64).toString("utf8");
  const payload = JSON.parse(payloadJson) as JWTPayload;

  const signedData = `${headerB64}.${payloadB64}`;

  console.log("Signed data:", signedData);

  return {
    header,
    payload,
    signatureB64,
    signedData,
  };
}

/**
 * Fetches Google's public keys and finds the matching key by 'kid'.
 * @param kid - The key ID to match.
 * @returns The matching JWK.
 */
export async function fetchMatchingPublicKey(kid: string): Promise<JWK> {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/certs");
  if (!response.ok) {
    throw new Error(`Failed to fetch public keys: ${response.statusText}`);
  }

  const keys = (await response.json()) as GoogleCertsResponse;
  const key = keys.keys.find((k) => k.kid === kid);

  if (!key) {
    throw new Error("No matching key found");
  }

  return key;
}

/**
 * Constructs the padded message according to PKCS#1 v1.5.
 * @param hashBytes - The hash of the message.
 * @param modulusLength - The length of the modulus in bytes.
 * @returns The padded message as a Buffer.
 */
export function constructPaddedMessage(
  hashBytes: Buffer,
  modulusLength: number
): Buffer {
  const DER_SHA256_PREFIX = Buffer.from([
    0x30, 0x31, 0x30, 0x0d, 0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65, 0x03,
    0x04, 0x02, 0x01, 0x05, 0x00, 0x04, 0x20,
  ]);

  const tLen = DER_SHA256_PREFIX.length + hashBytes.length;
  const psLength = modulusLength - tLen - 3;

  if (psLength < 8) {
    throw new Error("Intended encoded message length too short");
  }

  const padding = Buffer.alloc(psLength, 0xff);

  const paddedMessage = Buffer.concat([
    Buffer.from([0x00, 0x01]),
    padding,
    Buffer.from([0x00]),
    DER_SHA256_PREFIX,
    hashBytes,
  ]);

  return paddedMessage;
}
