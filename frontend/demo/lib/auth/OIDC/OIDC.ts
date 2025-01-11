import { AuthIdentity } from "../AuthIdentity";
import { OIDCAuthData, OIDCAuthIdentity } from "./types";

export type OIDCProvider = "google" | "facebook";

export class OIDC extends AuthIdentity<OIDCAuthIdentity, OIDCAuthData> {
  private static selectedProvider: OIDCProvider | null = null;

  public static setProvider(provider: OIDCProvider): void {
    this.selectedProvider = provider;
  }

  private static isSupportedByBrowser(): boolean {
    return typeof window !== "undefined";
  }

  async getAuthIdentity({
    clientId,
    issuer,
    email,
  }: {
    clientId: string;
    issuer: string;
    email: string;
  }): Promise<OIDCAuthIdentity | null> {
    if (!OIDC.isSupportedByBrowser()) {
      return null;
    }

    try {
      return {
        OIDC: {
          client_id: clientId,
          issuer: issuer,
          email: email,
        },
      };
    } catch (error) {
      console.error("Error getting OIDC auth identity:", error);
      return null;
    }
  }

  async sign(message: string, token: string): Promise<OIDCAuthData | null> {
    if (!OIDC.isSupportedByBrowser() || !OIDC.selectedProvider) {
      return null;
    }

    try {
      return {
        token: token,
        message: message,
      };
    } catch (error) {
      console.error("Error signing with OIDC:", error);
      return null;
    }
  }
}
