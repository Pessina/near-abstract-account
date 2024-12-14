import {
  decodeAndValidateToken,
  fetchMatchingPublicKey,
  importPublicKey,
  verifySignature,
} from "./utils.js";

export async function verifyRSA(token: string): Promise<boolean> {
  try {
    // Decode and validate token parts
    const { header, signatureB64, signedData } = await decodeAndValidateToken(
      token
    );

    // Fetch matching public key
    const key = await fetchMatchingPublicKey(header.kid);

    // Convert JWK to CryptoKey
    const publicKey = await importPublicKey(key);

    // Verify signature
    const isValid = await verifySignature(publicKey, signatureB64, signedData);

    console.log("isValid", isValid);

    return isValid;
  } catch (error) {
    console.error("RSA verification failed:", error);
    return false;
  }
}
