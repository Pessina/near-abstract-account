import { useState, useEffect, useCallback } from "react";

// Constants for OAuth configuration
const OAUTH_CONFIG = {
  CODE_VERIFIER_LENGTH: 128,
  STATE_LENGTH: 32,
  FACEBOOK_API_VERSION: "v21.0",
  STORAGE_KEYS: {
    CODE_VERIFIER: "codeVerifier",
    STATE: "state",
  },
} as const;

// Types for OAuth responses and states
type AuthStatus = "loading" | "success" | "error";

interface FacebookTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  id_token?: string;
}

interface FacebookAuthConfig {
  scope?: string;
  nonce?: string;
  responseType?: "code";
  codeChallengeMethod?: "S256" | "plain";
  extraParams?: Record<string, string>;
}

/**
 * Generates a random code verifier string for PKCE
 * @param length - Length of the code verifier
 * @returns Random string for code verifier
 */
function generateCodeVerifier(length: number): string {
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  return Array.from(crypto.getRandomValues(new Uint8Array(length)))
    .map((x) => possible.charAt(x % possible.length))
    .join("");
}

/**
 * Generates a code challenge from the code verifier using SHA-256
 * @param codeVerifier - The code verifier string
 * @returns Base64URL encoded code challenge
 */
async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
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
export function useFacebookAuth(config?: FacebookAuthConfig) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Initiates the Facebook login process
   * Sets up PKCE parameters and redirects to Facebook OAuth dialog
   */
  const initiateLogin = useCallback(async () => {
    try {
      setIsLoading(true);
      const codeVerifier = generateCodeVerifier(
        OAUTH_CONFIG.CODE_VERIFIER_LENGTH
      );
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      const state = generateCodeVerifier(OAUTH_CONFIG.STATE_LENGTH);
      const nonce = config?.nonce || generateCodeVerifier(32);

      // Store PKCE and state parameters securely
      localStorage.setItem(
        OAUTH_CONFIG.STORAGE_KEYS.CODE_VERIFIER,
        codeVerifier
      );
      localStorage.setItem(OAUTH_CONFIG.STORAGE_KEYS.STATE, state);

      const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
      if (!appId) {
        throw new Error("Facebook App ID is not configured");
      }

      // Get the current domain for Facebook app domain validation
      const currentDomain = window.location.hostname;
      const redirectUri = `${window.location.origin}/`;

      const url = new URL(
        `https://www.facebook.com/${OAUTH_CONFIG.FACEBOOK_API_VERSION}/dialog/oauth`
      );

      url.searchParams.append("client_id", appId);
      url.searchParams.append("redirect_uri", redirectUri);
      url.searchParams.append("state", state);
      url.searchParams.append("scope", config?.scope || "openid");
      url.searchParams.append("response_type", config?.responseType || "code");
      url.searchParams.append("code_challenge", codeChallenge);
      url.searchParams.append(
        "code_challenge_method",
        config?.codeChallengeMethod || "S256"
      );
      url.searchParams.append("nonce", nonce);

      // Add any extra parameters
      if (config?.extraParams) {
        Object.entries(config.extraParams).forEach(([key, value]) => {
          url.searchParams.append(key, value);
        });
      }

      // Add warning about Facebook App Domain configuration
      console.warn(
        `Ensure ${currentDomain} is added to App Domains in Facebook App Settings`
      );

      window.location.href = url.toString();
    } catch (error: unknown) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to initiate login process"
      );
      setIsLoading(false);
    }
  }, [config]);

  /**
   * Handles the OAuth callback
   * Validates state parameter and exchanges code for access token
   */
  const handleCallback = useCallback(async () => {
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

      const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
      if (!appId) {
        throw new Error("Facebook App ID is not configured");
      }

      const redirectUri = `${window.location.origin}/`;
      const tokenUrl = new URL(
        `https://graph.facebook.com/${OAUTH_CONFIG.FACEBOOK_API_VERSION}/oauth/access_token`
      );

      tokenUrl.searchParams.append("client_id", appId);
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
        setStatus("success");
        setMessage("Successfully logged in!");
        console.log("Access token:", data.access_token);
        if (data.id_token) {
          console.log("ID token:", data.id_token);
        }
      } else {
        throw new Error("Access token not received");
      }
    } catch (error: unknown) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Error exchanging code for token"
      );
    } finally {
      // Clean up sensitive data and URL params
      localStorage.removeItem(OAUTH_CONFIG.STORAGE_KEYS.CODE_VERIFIER);
      localStorage.removeItem(OAUTH_CONFIG.STORAGE_KEYS.STATE);
      cleanupSearchParams();
    }
  }, []);

  // Handle OAuth callback on component mount
  useEffect(() => {
    handleCallback();
  }, [handleCallback]);

  return {
    status,
    message,
    isLoading,
    initiateLogin,
  };
}
