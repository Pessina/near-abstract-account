"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useOIDCAuthContract } from "@/contracts/OIDCAuthContract/useOIDCAuthContract";

interface PublicKey {
  kid: string;
  n: string;
  e: string;
  alg: string;
  kty: string;
  use: string;
}

export default function UpdateOIDCKeys() {
  const { contract } = useOIDCAuthContract();
  const [status, setStatus] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const fetchAndUpdateKeys = async () => {
    try {
      setIsLoading(true);
      setStatus("Fetching keys...");

      const providers = [
        {
          name: "Google",
          url: "/admin/api/oidc/google/keys",
          issuer: "https://accounts.google.com"
        },
        {
          name: "Facebook",
          url: "/admin/api/oidc/facebook/keys",
          issuer: "https://www.facebook.com"
        },
        {
          name: "Auth0",
          url: "/admin/api/oidc/auth0/keys",
          issuer: "https://dev-um3ne30lucm6ehqq.us.auth0.com/"
        }
      ];

      const responses = await Promise.all(
        providers.map(provider => fetch(provider.url))
      );

      const data = await Promise.all(
        responses.map(response => response.json())
      );

      responses.forEach((response, i) => {
        if (!response.ok) {
          throw new Error(data[i].error || `Failed to fetch ${providers[i].name} keys`);
        }
      });

      const formattedKeys = data.map(providerData =>
        providerData.keys.map((key: PublicKey) => ({
          kid: key.kid,
          n: key.n,
          e: key.e,
          alg: key.alg,
          kty: key.kty,
          use: key.use || "",
        }))
      );

      await Promise.all(
        providers.map((provider, i) =>
          contract?.updateKeys(provider.issuer, formattedKeys[i])
        )
      );

      setStatus("Successfully updated keys");
    } catch (error) {
      setStatus(`Error updating keys: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getKeys = async () => {
    const keys = await contract?.getKeys()
    console.log({ keys })
  }

  return (
    <div className="space-y-4">
      <div className="flex space-x-4">
        <Button onClick={fetchAndUpdateKeys} disabled={isLoading}>
          Update Keys
        </Button>
        <Button onClick={getKeys}>
          Get keys
        </Button>
      </div>
      {status && <p className="text-sm text-gray-500">{status}</p>}
    </div>
  );
}
