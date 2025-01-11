"use client";

import { GoogleLogin } from '@react-oauth/google';
import { CredentialResponse } from '@react-oauth/google';

interface GoogleButtonProps {
  onSuccess?: (response: CredentialResponse) => void;
  onError?: () => void;
}

const GoogleButton = ({ onSuccess, onError }: GoogleButtonProps) => {
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
        nonce="test_123_felipe"
        locale='pt_BR'
        useOneTap
      />
    </div>
  );
};

export default GoogleButton;