import { z } from "zod";

const envSchema = z.object({
  abstractAccountContract: z
    .string()
    .min(1, "NEXT_PUBLIC_ABSTRACT_ACCOUNT_CONTRACT is not defined"),
  oidcAuthContract: z
    .string()
    .min(1, "NEXT_PUBLIC_OIDC_AUTH_CONTRACT is not defined"),
  signerContract: z
    .string()
    .min(1, "NEXT_PUBLIC_SIGNER_CONTRACT is not defined"),
  nearAccountId: z
    .string()
    .min(1, "NEXT_PUBLIC_NEAR_ACCOUNT_ID is not defined"),
  nearPrivateKey: z
    .string()
    .min(1, "NEXT_PUBLIC_NEAR_PRIVATE_KEY is not defined"),
  networkId: z.string().min(1, "NEXT_PUBLIC_NETWORK_ID is not defined"),
  facebookAppId: z
    .string()
    .min(1, "NEXT_PUBLIC_FACEBOOK_APP_ID is not defined"),
  googleClientId: z
    .string()
    .min(1, "NEXT_PUBLIC_GOOGLE_CLIENT_ID is not defined"),
  auth0Domain: z.string().min(1, "NEXT_PUBLIC_AUTH0_DOMAIN is not defined"),
  auth0ClientId: z
    .string()
    .min(1, "NEXT_PUBLIC_AUTH0_CLIENT_ID is not defined"),
  infuraRpcUrl: z.string().min(1, "NEXT_PUBLIC_INFURA_RPC_URL is not defined"),
});

type Env = z.infer<typeof envSchema>;

export const useEnv = (): Env => {
  const env = {
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

  return envSchema.parse(env);
};
