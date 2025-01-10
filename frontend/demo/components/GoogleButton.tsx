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
        locale='en-US'
        onSuccess={response => {
          console.log(response);
          onSuccess?.(response);
        }}
        onError={() => {
          console.log('Google login failed');
          onError?.();
        }}
        useOneTap
      />
    </div>
  );
};

export default GoogleButton;