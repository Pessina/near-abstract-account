"use client";

import { useFacebookAuth } from "facebook-oauth-pkce";

import { Button } from "@/components/ui/button";
import { useEnv } from "@/hooks/useEnv";

type FacebookButtonProps = {
  text: string;
  onSuccess: (idToken: string) => void;
  onError: (error: Error) => void;
  nonce?: string;
};

export default function FacebookButton({
  text,
  onSuccess,
  onError,
  nonce,
}: FacebookButtonProps) {
  const { facebookAppId } = useEnv();
  const { initiateLogin } = useFacebookAuth({
    scope: "email",
    appId: facebookAppId,
    onSuccess: (idToken) => {
      if (idToken) {
        onSuccess(idToken);
      } else {
        onError(new Error("No token received from Facebook"));
      }
    },
    onError: (error: Error) => {
      onError(error);
    },
  });

  const handleLogin = async () => {
    await initiateLogin({
      nonce,
    });
  };

  return (
    <Button
      onClick={handleLogin}
      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
    >
      {text}
    </Button>
  );
}
