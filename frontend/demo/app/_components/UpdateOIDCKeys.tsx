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

  const fetchAndUpdateKeys = async () => {
    try {
      setIsLoading(true);
      setStatus("Fetching Google keys...");

      const [googleResponse, facebookResponse] = await Promise.all([
        fetch("/api/oidc/google/keys"),
        fetch("/api/oidc/facebook/keys")
      ]);

      const [googleData, facebookData] = await Promise.all([
        googleResponse.json(),
        facebookResponse.json()
      ]);

      if (!googleResponse.ok) {
        throw new Error(googleData.error || 'Failed to fetch Google keys');
      }

      if (!facebookResponse.ok) {
        throw new Error(facebookData.error || 'Failed to fetch Facebook keys');
      }

      const googleKeys: PublicKey[] = googleData.keys.map((key: PublicKey) => ({
        kid: key.kid,
        n: key.n,
        e: key.e,
        alg: key.alg,
        kty: key.kty,
        use: key.use || "",
      }));

      const facebookKeys: PublicKey[] = facebookData.keys.map((key: PublicKey) => ({
        kid: key.kid,
        n: key.n,
        e: key.e,
        alg: key.alg,
        kty: key.kty,
        use: key.use || "",
      }));

      await Promise.all([
        contract?.updateKeys("https://accounts.google.com", googleKeys),
        contract?.updateKeys("https://www.facebook.com", facebookKeys)
      ]);

      setStatus("Successfully updated Google keys");
    } catch (error) {
      setStatus(`Error updating Google keys: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getKeys = async () => {
    const googleKeys = await contract?.getKeys("https://accounts.google.com")
    const facebookKeys = await contract?.getKeys("https://www.facebook.com")
    console.log({ facebookKeys, googleKeys })
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
