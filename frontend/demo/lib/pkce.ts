/**
 * Generates a cryptographically secure code verifier for PKCE
 * @returns A random code verifier string with 256 bits of entropy
 */
export function generatePKCEVerifier(): string {
  // Generate 32 bytes of random data (256 bits of entropy)
  const buffer = new Uint8Array(32);
  crypto.getRandomValues(buffer);

  // Convert to base64url encoding and remove padding
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Creates a code challenge from a code verifier using SHA-256
 * @param codeVerifier The code verifier to hash
 * @returns Base64url encoded code challenge
 */
export async function generatePKCEChallenge(
  codeVerifier: string
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);

  // Hash the code verifier with SHA-256
  const hash = await crypto.subtle.digest("SHA-256", data);

  // Convert hash to base64url string
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}
