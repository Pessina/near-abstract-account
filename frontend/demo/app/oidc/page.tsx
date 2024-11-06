"use client";

import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

const OIDCPage = () => {
  return (
    <div>
      <h1>OIDC</h1>
      <GoogleOAuthProvider clientId="876834174282-6ce99dphnb5ls945b783kfjkr5uh7e03.apps.googleusercontent.com">
        <GoogleLogin
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
