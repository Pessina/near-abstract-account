"use client";

import { useEffect, useCallback } from "react";
import { getCurrentCleanUrl } from "@/lib/url";
import { generatePKCEVerifier, generatePKCEChallenge } from "@/lib/pkce";

const OAUTH_CONFIG = {
  X_API_VERSION: "2",
  STORAGE_KEYS: {
    CODE_VERIFIER: "xCodeVerifier",
    STATE: "xState",
    REDIRECT_URI: "xRedirectUri",
  },
};

interface XAuthConfig {
  clientId: string;
  redirectUri?: string;
  scope: string;
  onSuccess?: (token: string) => void;
  onError?: (error: Error) => void;
}

export function useXAuth(config: XAuthConfig) {
  const initiateLogin = useCallback(async () => {
    try {
      // Generate PKCE code verifier and challenge
      const codeVerifier = generatePKCEVerifier();
      const codeChallenge = await generatePKCEChallenge(codeVerifier);

      // Generate cryptographically secure random state for CSRF protection
      const state = crypto.randomUUID();

      // Store PKCE and state values
      localStorage.setItem(
        OAUTH_CONFIG.STORAGE_KEYS.CODE_VERIFIER,
        codeVerifier
      );
      localStorage.setItem(OAUTH_CONFIG.STORAGE_KEYS.STATE, state);

      // Get and store redirect URI, ensuring it's properly encoded
      const redirectUri = config.redirectUri || getCurrentCleanUrl();
      localStorage.setItem(OAUTH_CONFIG.STORAGE_KEYS.REDIRECT_URI, redirectUri);

      // Construct authorization URL with required parameters
      const authUrl = new URL("https://twitter.com/i/oauth2/authorize");
      authUrl.searchParams.append("response_type", "code");
      authUrl.searchParams.append("client_id", config.clientId);
      authUrl.searchParams.append("redirect_uri", redirectUri);
      authUrl.searchParams.append("scope", config.scope);
      authUrl.searchParams.append("state", state);
      authUrl.searchParams.append("code_challenge", codeChallenge);
      authUrl.searchParams.append("code_challenge_method", "S256");

      // Redirect to authorization URL
      window.location.href = authUrl.toString();
    } catch (error) {
      if (error instanceof Error && config.onError) {
        config.onError(error);
      }
      console.error(error);
    }
  }, [config]);

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const stateParam = urlParams.get("state");
      const error = urlParams.get("error");
      const errorDescription = urlParams.get("error_description");

      // Handle OAuth error response
      if (error || errorDescription) {
        const errorMessage = errorDescription || error || "Unknown OAuth error";
        if (config.onError) {
          config.onError(new Error(errorMessage));
        }
        return;
      }

      if (!code || !stateParam) return;

      // Verify stored values
      const storedState = localStorage.getItem(OAUTH_CONFIG.STORAGE_KEYS.STATE);
      const codeVerifier = localStorage.getItem(
        OAUTH_CONFIG.STORAGE_KEYS.CODE_VERIFIER
      );
      const storedRedirectUri = localStorage.getItem(
        OAUTH_CONFIG.STORAGE_KEYS.REDIRECT_URI
      );

      try {
        // Validate state parameter to prevent CSRF attacks
        if (stateParam !== storedState) {
          throw new Error("Invalid state parameter");
        }

        if (!codeVerifier) {
          throw new Error("Code verifier not found");
        }

        if (!storedRedirectUri) {
          throw new Error("Redirect URI not found");
        }

        debugger;

        // Exchange authorization code for access token
        const tokenUrl = new URL("https://api.x.com/2/oauth2/token");
        const body = new URLSearchParams();
        body.append("code", code);
        body.append("grant_type", "authorization_code");
        body.append("client_id", config.clientId);
        body.append("redirect_uri", storedRedirectUri);
        body.append("code_verifier", codeVerifier);

        // Log curl command instead of making the request
        console.log(`curl -X POST '${tokenUrl.toString()}' \\
          -H 'Content-Type: application/x-www-form-urlencoded' \\
          -d '${body.toString()}'`);

        // Failing on CORS and it's not support by X yet

        //   const response = await fetch(tokenUrl.toString(), {
        //     method: "POST",
        //     headers: {
        //       "Content-Type": "application/x-www-form-urlencoded",
        //     },
        //     body: body.toString(),
        //   });

        // // Mock response to maintain code flow
        // const response = {
        //   ok: true,
        //   async json() {
        //     return { access_token: "MOCK_TOKEN" };
        //   }
        // };

        // const data = await response.json();

        // if (!response.ok) {
        //   // Handle specific error for invalid authorization code
        //   if (
        //     data.error === "invalid_request" &&
        //     data.error_description?.includes("authorization code was invalid")
        //   ) {
        //     throw new Error(
        //       "Authorization code has expired or is invalid. Please try logging in again."
        //     );
        //   }
        //   throw new Error(
        //     data.error_description ||
        //       data.error ||
        //       "Failed to fetch access token"
        //   );
        // }

        // if (data.access_token) {
        //   if (config.onSuccess) {
        //     config.onSuccess(data.access_token);
        //   }
        // } else {
        //   throw new Error("Access token not received");
        // }
      } catch (error) {
        if (error instanceof Error && config.onError) {
          config.onError(error);
        }
        console.error(error);
      } finally {
        // Clean up stored values
        localStorage.removeItem(OAUTH_CONFIG.STORAGE_KEYS.CODE_VERIFIER);
        localStorage.removeItem(OAUTH_CONFIG.STORAGE_KEYS.STATE);
        localStorage.removeItem(OAUTH_CONFIG.STORAGE_KEYS.REDIRECT_URI);
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
      }
    };

    handleCallback();
  }, [config]);

  return {
    initiateLogin,
  };
}
