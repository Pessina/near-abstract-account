interface Env {
  abstractAccountContract: string;
  oidcAuthContract: string;
  signerContract: string;
  nearAccountId: string;
  nearPrivateKey: string;
  networkId: string;
  facebookAppId: string;
  googleClientId: string;
  auth0Domain: string;
  auth0ClientId: string;
  infuraRpcUrl: string;
}

export const useEnv = (): Env => {
  if (!process.env.NEXT_PUBLIC_ABSTRACT_ACCOUNT_CONTRACT) {
    throw new Error("NEXT_PUBLIC_ABSTRACT_ACCOUNT_CONTRACT is not defined");
  }
  if (!process.env.NEXT_PUBLIC_OIDC_AUTH_CONTRACT) {
    throw new Error("NEXT_PUBLIC_OIDC_AUTH_CONTRACT is not defined");
  }
  if (!process.env.NEXT_PUBLIC_SIGNER_CONTRACT) {
    throw new Error("NEXT_PUBLIC_SIGNER_CONTRACT is not defined");
  }
  if (!process.env.NEXT_PUBLIC_NEAR_ACCOUNT_ID) {
    throw new Error("NEXT_PUBLIC_NEAR_ACCOUNT_ID is not defined");
  }
  if (!process.env.NEXT_PUBLIC_NEAR_PRIVATE_KEY) {
    throw new Error("NEXT_PUBLIC_NEAR_PRIVATE_KEY is not defined");
  }
  if (!process.env.NEXT_PUBLIC_NETWORK_ID) {
    throw new Error("NEXT_PUBLIC_NETWORK_ID is not defined");
  }
  if (!process.env.NEXT_PUBLIC_FACEBOOK_APP_ID) {
    throw new Error("NEXT_PUBLIC_FACEBOOK_APP_ID is not defined");
  }
  if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
    throw new Error("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not defined");
  }
  if (!process.env.NEXT_PUBLIC_AUTH0_DOMAIN) {
    throw new Error("NEXT_PUBLIC_AUTH0_DOMAIN is not defined");
  }
  if (!process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID) {
    throw new Error("NEXT_PUBLIC_AUTH0_CLIENT_ID is not defined");
  }
  if (!process.env.NEXT_PUBLIC_INFURA_RPC_URL) {
    throw new Error("NEXT_PUBLIC_INFURA_RPC_URL is not defined");
  }

  return {
    abstractAccountContract: process.env.NEXT_PUBLIC_ABSTRACT_ACCOUNT_CONTRACT,
    oidcAuthContract: process.env.NEXT_PUBLIC_OIDC_AUTH_CONTRACT,
    signerContract: process.env.NEXT_PUBLIC_SIGNER_CONTRACT,
    nearAccountId: process.env.NEXT_PUBLIC_NEAR_ACCOUNT_ID,
    nearPrivateKey: process.env.NEXT_PUBLIC_NEAR_PRIVATE_KEY,
    networkId: process.env.NEXT_PUBLIC_NETWORK_ID,
    facebookAppId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID,
    googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    auth0Domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
    auth0ClientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
    infuraRpcUrl: process.env.NEXT_PUBLIC_INFURA_RPC_URL,
  };
};
