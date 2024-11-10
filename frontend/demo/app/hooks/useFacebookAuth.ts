import { useState, useEffect, useCallback } from "react";

function generateCodeVerifier(length: number): string {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function useFacebookAuth() {
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const initiateLogin = useCallback(async () => {
    setIsLoading(true);
    const codeVerifier = generateCodeVerifier(128);
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateCodeVerifier(32);

    localStorage.setItem("codeVerifier", codeVerifier);
    localStorage.setItem("state", state);

    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    const redirectUri = encodeURIComponent(window.location.origin + "/");

    const url = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&state=${state}&scope=openid&response_type=code&code_challenge=${codeChallenge}&code_challenge_method=S256`;

    window.location.href = url;
  }, []);

  const handleCallback = useCallback(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const stateParam = urlParams.get("state");

    if (!code || !stateParam) {
      setStatus("error");
      setMessage("Missing code or state parameter");
      return;
    }

    const storedState = localStorage.getItem("state");
    const codeVerifier = localStorage.getItem("codeVerifier");

    if (stateParam !== storedState) {
      setStatus("error");
      setMessage("Invalid state parameter");
      return;
    }

    if (!codeVerifier) {
      setStatus("error");
      setMessage("Code verifier not found");
      return;
    }

    try {
      const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
      const redirectUri = encodeURIComponent(window.location.origin + "/");

      const response = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&redirect_uri=${redirectUri}&code_verifier=${codeVerifier}&code=${code}`,
        {
          method: "GET",
        }
      );

      const data = await response.json();

      if (data.access_token) {
        setStatus("success");
        setMessage("Successfully logged in!");
        console.log({ data });
      } else {
        setStatus("error");
        setMessage("Failed to obtain access token");
      }
    } catch (error) {
      setStatus("error");
      setMessage("Error exchanging code for token");
    }

    // Clear localStorage
    localStorage.removeItem("codeVerifier");
    localStorage.removeItem("state");
  }, []);

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
