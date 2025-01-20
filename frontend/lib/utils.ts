import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseOIDCToken(token: string): {
  issuer: string;
  sub: string;
  email: string;
} {
  try {
    // OIDC tokens are base64url encoded JSON
    const [, payload] = token.split(".");
    if (!payload) throw new Error("Invalid token format");

    // base64url decode the payload
    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf-8")
    );

    // Extract required fields
    const issuer = decoded.iss;
    const sub = decoded.sub;
    const email = decoded.email;

    if (!issuer || !sub || !email) {
      throw new Error("Missing required fields in token");
    }

    return {
      issuer,
      sub,
      email,
    };
  } catch (error) {
    throw new Error(`Failed to parse OIDC token: ${error}`);
  }
}
