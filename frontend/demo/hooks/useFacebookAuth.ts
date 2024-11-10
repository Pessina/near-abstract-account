import { generatePKCEVerifier, generatePKCEChallenge } from "@/lib/pkce";
import { useEffect, useCallback } from "react";
import { getCurrentCleanUrl } from "@/lib/url";

// Constants for OAuth configuration
const OAUTH_CONFIG = {
  FACEBOOK_API_VERSION: "v21.0",
  STORAGE_KEYS: {
    CODE_VERIFIER: "codeVerifier",
    STATE: "state",
  },
} as const;

interface FacebookTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  id_token?: string;
}

interface FacebookAuthConfig {
  appId: string;
  scope?: string;
  nonce?: string;
  responseType?: "code";
  redirectUri?: string;
  onSuccess?: (idToken?: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Cleans up URL search params and hash fragments after auth flow completes
 */
function cleanupSearchParams() {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  window.history.replaceState({}, "", url.toString());
}

/**
 * Custom hook for handling Facebook OAuth authentication
 * Implements PKCE flow for enhanced security
 */
export function useFacebookAuth(config: FacebookAuthConfig) {
  /**
   * Initiates the Facebook login process
   * Sets up PKCE parameters and redirects to Facebook OAuth dialog
   */
  const initiateLogin = useCallback(
    async (args?: { nonce?: string }) => {
      try {
        // Generate PKCE values with 256 bits of entropy
        const codeVerifier = generatePKCEVerifier();
        const codeChallenge = await generatePKCEChallenge(codeVerifier);
        const state = generatePKCEVerifier();
        const nonce = args?.nonce || config?.nonce || generatePKCEVerifier();

        localStorage.setItem(
          OAUTH_CONFIG.STORAGE_KEYS.CODE_VERIFIER,
          codeVerifier
        );
        localStorage.setItem(OAUTH_CONFIG.STORAGE_KEYS.STATE, state);

        if (!config.appId) {
          throw new Error("Facebook App ID is required");
        }

        const redirectUri = config.redirectUri || getCurrentCleanUrl();
        const url = new URL(
          `https://www.facebook.com/${OAUTH_CONFIG.FACEBOOK_API_VERSION}/dialog/oauth`
        );

        url.searchParams.append("client_id", config.appId);
        url.searchParams.append("redirect_uri", redirectUri);
        url.searchParams.append("state", state);
        url.searchParams.append("scope", config?.scope || "openid");
        url.searchParams.append(
          "response_type",
          config?.responseType || "code"
        );
        url.searchParams.append("code_challenge", codeChallenge);
        // Always use S256 code challenge method for better security
        url.searchParams.append("code_challenge_method", "S256");
        url.searchParams.append("nonce", nonce);

        window.location.href = url.toString();
      } catch (error: unknown) {
        if (error instanceof Error && config.onError) {
          config.onError(error);
        }
        console.error(error);
      }
    },
    [config]
  );

  // Handle OAuth callback on component mount
  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const stateParam = urlParams.get("state");

      // Early return if no auth code present
      if (!code || !stateParam) {
        return;
      }

      const storedState = localStorage.getItem(OAUTH_CONFIG.STORAGE_KEYS.STATE);
      const codeVerifier = localStorage.getItem(
        OAUTH_CONFIG.STORAGE_KEYS.CODE_VERIFIER
      );

      try {
        // Validate state parameter to prevent CSRF attacks
        if (stateParam !== storedState) {
          throw new Error("Invalid state parameter");
        }

        if (!codeVerifier) {
          throw new Error("Code verifier not found");
        }

        if (!config.appId) {
          throw new Error("Facebook App ID is required");
        }

        const redirectUri = config.redirectUri || getCurrentCleanUrl();
        const tokenUrl = new URL(
          `https://graph.facebook.com/${OAUTH_CONFIG.FACEBOOK_API_VERSION}/oauth/access_token`
        );

        tokenUrl.searchParams.append("client_id", config.appId);
        tokenUrl.searchParams.append("redirect_uri", redirectUri);
        tokenUrl.searchParams.append("code_verifier", codeVerifier);
        tokenUrl.searchParams.append("code", code);

        const response = await fetch(tokenUrl.toString(), {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch access token");
        }

        const data = (await response.json()) as FacebookTokenResponse;

        if (data.access_token) {
          if (config.onSuccess) {
            config.onSuccess(data.id_token);
          }
        } else {
          throw new Error("Access token not received");
        }
      } catch (error: unknown) {
        if (error instanceof Error && config.onError) {
          config.onError(error);
        }
        console.error(error);
      } finally {
        // Clean up sensitive data and URL params
        localStorage.removeItem(OAUTH_CONFIG.STORAGE_KEYS.CODE_VERIFIER);
        localStorage.removeItem(OAUTH_CONFIG.STORAGE_KEYS.STATE);
        cleanupSearchParams();
      }
    };

    handleCallback();
  }, [config]);

  return {
    initiateLogin,
  };
}
