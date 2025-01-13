"use client";

import { GoogleLogin } from "@react-oauth/google";
import { CredentialResponse } from "@react-oauth/google";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface UseAuthGoogle {
  onSuccess?: (response: CredentialResponse) => void;
  onError?: () => void;
}

export const useGoogleAuth = ({ onSuccess, onError }: UseAuthGoogle) => {
  const [nonce, setNonce] = useState<string | undefined>();

  useEffect(() => {
    const portalContainer = document.createElement("div");
    portalContainer.id = "google-login-portal";
    document.body.appendChild(portalContainer);

    createPortal(
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-xl">
          <GoogleLogin
            onSuccess={(response) => {
              console.log(response);
              onSuccess?.(response);
            }}
            onError={() => {
              console.log("Google login failed");
              onError?.();
            }}
            nonce={nonce}
            useOneTap
          />
        </div>
      </div>,
      portalContainer
    );

    return () => {
      document.body.removeChild(portalContainer);
    };
  }, [onSuccess, onError, nonce]);

  const initiateLogin = (args?: { nonce?: string }) => {
    setNonce(args?.nonce);
  };

  return {
    initiateLogin,
  };
};
