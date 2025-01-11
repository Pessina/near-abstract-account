"use client";

import { GoogleLogin } from '@react-oauth/google';
import { CredentialResponse } from '@react-oauth/google';

interface GoogleButtonProps {
  onSuccess?: (response: CredentialResponse) => void;
  onError?: () => void;
  nonce?: string;
}

const GoogleButton = ({ onSuccess, onError, nonce }: GoogleButtonProps) => {
  return (
    <div className="w-full">
      <GoogleLogin
        onSuccess={response => {
          console.log(response);
          onSuccess?.(response);
        }}
        onError={() => {
          console.log('Google login failed');
          onError?.();
        }}
        nonce={nonce}
        locale='pt_BR'
        useOneTap
      />
    </div>
  );
};

export default GoogleButton;