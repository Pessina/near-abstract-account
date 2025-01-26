import { useCallback } from "react";

import { generatePKCEVerifier, generatePKCEChallenge } from "@/lib/pkce";

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
 * Custom hook for handling Facebook OAuth authentication
 * Implements PKCE flow for enhanced security
 */
export function useFacebookAuth(config: FacebookAuthConfig) {
  const initiateLogin = useCallback(
    async (args?: { nonce?: string }) => {
      let popup: Window | null = null;

      const cleanup = () => {
        localStorage.removeItem(OAUTH_CONFIG.STORAGE_KEYS.CODE_VERIFIER);
        localStorage.removeItem(OAUTH_CONFIG.STORAGE_KEYS.STATE);
        if (popup && !popup.closed) {
          popup.close();
        }
      };

      try {
        // Generate PKCE values
        const codeVerifier = generatePKCEVerifier();
        const codeChallenge = await generatePKCEChallenge(codeVerifier);
        const state = generatePKCEVerifier();
        const nonce = args?.nonce || config?.nonce || generatePKCEVerifier();

        // Store auth state
        localStorage.setItem(
          OAUTH_CONFIG.STORAGE_KEYS.CODE_VERIFIER,
          codeVerifier
        );
        localStorage.setItem(OAUTH_CONFIG.STORAGE_KEYS.STATE, state);

        if (!config.appId) {
          throw new Error("Facebook App ID is required");
        }

        // Always use our callback URL
        const redirectUri = `${window.location.origin}/auth/facebook/callback`;
        const url = new URL(
          `https://www.facebook.com/${OAUTH_CONFIG.FACEBOOK_API_VERSION}/dialog/oauth`
        );

        // Add required OIDC parameters
        url.searchParams.append("client_id", config.appId);
        url.searchParams.append("redirect_uri", redirectUri);
        url.searchParams.append("state", state);
        url.searchParams.append("scope", "openid " + (config?.scope || ""));
        url.searchParams.append("response_type", "code");
        url.searchParams.append("code_challenge", codeChallenge);
        url.searchParams.append("code_challenge_method", "S256");
        url.searchParams.append("nonce", nonce);

        // Create a promise that resolves when the code is received
        const authPromise = new Promise<void>((resolve, reject) => {
          const messageHandler = async (event: MessageEvent) => {
            // Verify origin
            if (event.origin !== window.location.origin) return;

            if (event.data?.type === "FACEBOOK_AUTH_SUCCESS") {
              const { code, returnedState } = event.data;

              try {
                // Validate state
                if (returnedState !== state) {
                  throw new Error("Invalid state parameter");
                }

                // Exchange code for token using PKCE
                const tokenUrl = new URL(
                  `https://graph.facebook.com/${OAUTH_CONFIG.FACEBOOK_API_VERSION}/oauth/access_token`
                );

                const params = new URLSearchParams({
                  client_id: config.appId,
                  redirect_uri: redirectUri,
                  code_verifier: codeVerifier,
                  code: code,
                });

                const response = await fetch(
                  `${tokenUrl.toString()}?${params.toString()}`,
                  {
                    method: "GET",
                    headers: { Accept: "application/json" },
                  }
                );

                if (!response.ok) {
                  throw new Error("Failed to fetch access token");
                }

                const data = (await response.json()) as FacebookTokenResponse;

                if (data.access_token && config.onSuccess) {
                  config.onSuccess(data.id_token);
                  resolve();
                } else {
                  throw new Error("Access token not received");
                }
              } catch (error) {
                if (error instanceof Error && config.onError) {
                  config.onError(error);
                }
                console.error(error);
                reject(error);
              } finally {
                window.removeEventListener("message", messageHandler);
                cleanup();
              }
            } else if (event.data?.type === "FACEBOOK_AUTH_ERROR") {
              const { error } = event.data;
              window.removeEventListener("message", messageHandler);
              cleanup();
              reject(new Error(error));
            }
          };

          window.addEventListener("message", messageHandler);

          // Open popup window
          const width = 600;
          const height = 700;
          const left = Math.max(
            0,
            (window.innerWidth - width) / 2 + window.screenX
          );
          const top = Math.max(
            0,
            (window.innerHeight - height) / 2 + window.screenY
          );

          popup = window.open(
            url.toString(),
            "facebook-auth-window",
            `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,location=no,status=no,scrollbars=yes`
          );

          if (!popup) {
            throw new Error(
              "Failed to open popup window. Please allow popups for this site."
            );
          }
        });

        // Wait for authentication to complete
        await authPromise;
      } catch (error) {
        cleanup();
        if (error instanceof Error && config.onError) {
          config.onError(error);
        }
        console.error(error);
      }
    },
    [config]
  );

  return {
    initiateLogin,
  };
}
