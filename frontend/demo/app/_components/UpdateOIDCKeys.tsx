"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { OIDCAuthContract } from "@/lib/contract/OIDCAuthContract";
import initNear from "@/lib/near";

interface PublicKey {
  kid: string;
  n: string;
  e: string;
  alg: string;
  kty: string;
  use: string;
}

export default function UpdateOIDCKeys() {
  const [contract, setContract] = useState<OIDCAuthContract | null>(null)
  const [status, setStatus] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const setupContract = async () => {
      const { account } = await initNear()
      const oidcContractInstance = new OIDCAuthContract({
        account,
        contractId: process.env.NEXT_PUBLIC_OIDC_AUTH_CONTRACT as string
      })
      setContract(oidcContractInstance)
    }
    setupContract()
  }, [])

  const fetchAndUpdateGoogleKeys = async () => {
    try {
      setIsLoading(true);
      setStatus("Fetching Google keys...");

      const response = await fetch(
        "https://www.googleapis.com/oauth2/v3/certs"
      );
      const data = await response.json();

      for (const key of data.keys) {
        const publicKey: PublicKey = {
          kid: key.kid,
          n: key.n,
          e: key.e,
          alg: key.alg,
          kty: key.kty,
          use: key.use || "",
        };

        await contract?.updateGoogleKey(key.kid, publicKey);
      }

      setStatus("Successfully updated Google keys");
    } catch (error) {
      setStatus(`Error updating Google keys: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAndUpdateFacebookKeys = async () => {
    try {
      setIsLoading(true);
      setStatus("Fetching Facebook keys...");

      const response = await fetch(
        `https://corsproxy.io/?url=https://www.facebook.com/.well-known/oauth/openid/jwks`
      );
      const data = await response.json();

      for (const key of data.keys) {
        const publicKey: PublicKey = {
          kid: key.kid,
          n: key.n,
          e: key.e,
          alg: key.alg,
          kty: key.kty,
          use: key.use || "",
        };

        await contract?.updateFacebookKey(key.kid, publicKey);
      }

      setStatus("Successfully updated Facebook keys");
    } catch (error) {
      setStatus(`Error updating Facebook keys: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex space-x-4">
        <Button onClick={fetchAndUpdateGoogleKeys} disabled={isLoading}>
          Update Google Keys
        </Button>
        <Button onClick={fetchAndUpdateFacebookKeys} disabled={isLoading}>
          Update Facebook Keys
        </Button>
      </div>
      {status && <p className="text-sm text-gray-500">{status}</p>}
    </div>
  );
}
