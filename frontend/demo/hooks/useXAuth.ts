"use client";

import { useEffect, useCallback } from "react";
import { getCurrentCleanUrl } from "@/lib/url";
import { generatePKCEVerifier, generatePKCEChallenge } from "@/lib/pkce";

const OAUTH_CONFIG = {
  X_API_VERSION: "2",
  STORAGE_KEYS: {
    CODE_VERIFIER: "xCodeVerifier",
    STATE: "xState",
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
      const codeVerifier = generatePKCEVerifier();
      const codeChallenge = await generatePKCEChallenge(codeVerifier);
      const state = generatePKCEVerifier();

      localStorage.setItem(
        OAUTH_CONFIG.STORAGE_KEYS.CODE_VERIFIER,
        codeVerifier
      );
      localStorage.setItem(OAUTH_CONFIG.STORAGE_KEYS.STATE, state);

      const authUrl = new URL(`https://twitter.com/i/oauth2/authorize`);
      authUrl.searchParams.append("response_type", "code");
      authUrl.searchParams.append("client_id", config.clientId);
      authUrl.searchParams.append(
        "redirect_uri",
        config?.redirectUri || getCurrentCleanUrl()
      );
      authUrl.searchParams.append("scope", config.scope);
      authUrl.searchParams.append("state", state);
      authUrl.searchParams.append("code_challenge", codeChallenge);
      authUrl.searchParams.append("code_challenge_method", "S256");

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

      if (!code || !stateParam) return;

      const storedState = localStorage.getItem(OAUTH_CONFIG.STORAGE_KEYS.STATE);
      const codeVerifier = localStorage.getItem(
        OAUTH_CONFIG.STORAGE_KEYS.CODE_VERIFIER
      );

      try {
        if (stateParam !== storedState) {
          throw new Error("Invalid state parameter");
        }

        if (!codeVerifier) {
          throw new Error("Code verifier not found");
        }

        const tokenUrl = new URL(
          `https://api.twitter.com/${OAUTH_CONFIG.X_API_VERSION}/oauth2/token`
        );
        const body = new URLSearchParams();
        body.append("grant_type", "authorization_code");
        body.append("code", code);
        body.append(
          "redirect_uri",
          config?.redirectUri || getCurrentCleanUrl()
        );
        body.append("code_verifier", codeVerifier);

        const response = await fetch(tokenUrl.toString(), {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: body.toString(),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch access token");
        }

        const data = await response.json();

        if (data.access_token) {
          if (config.onSuccess) {
            config.onSuccess(data.access_token);
          }
        } else {
          throw new Error("Access token not received");
        }
      } catch (error) {
        if (error instanceof Error && config.onError) {
          config.onError(error);
        }
        console.error(error);
      } finally {
        localStorage.removeItem(OAUTH_CONFIG.STORAGE_KEYS.CODE_VERIFIER);
        localStorage.removeItem(OAUTH_CONFIG.STORAGE_KEYS.STATE);
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
