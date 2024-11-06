"use client";

import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

const OIDCPage = () => {
  return (
    <div>
      <h1>OIDC</h1>
      <GoogleOAuthProvider
        nonce='felipe-1000'
        clientId="876834174282-6ce99dphnb5ls945b783kfjkr5uh7e03.apps.googleusercontent.com">
        <GoogleLogin
          useOneTap
          nonce='felipe-1000'
          onSuccess={credentialResponse => {
            console.log(credentialResponse);
          }}
          onError={() => {
            console.log('Login Failed');
          }}
        />
      </GoogleOAuthProvider>
    </div>
  );
};

export default OIDCPage;
