"use client";

import { useState, useEffect } from "react";

import { OIDCAuthContract } from "./OIDCAuthContract";

import { useEnv } from "@/hooks/useEnv";
import { useInitNear } from "@/hooks/useInitNear";

export const useOIDCAuthContract = () => {
  const [contract, setContract] = useState<OIDCAuthContract | null>(null);
  const { near, error, isLoading } = useInitNear();
  const { nearAccountId, oidcAuthContract } = useEnv();

  useEffect(() => {
    const setupContract = async () => {
      if (!near) return;

      try {
        const account = await near.account(nearAccountId);
        const contractInstance = new OIDCAuthContract({
          account,
          contractId: oidcAuthContract,
        });
        setContract(contractInstance);
      } catch (err) {
        console.error("Error setting up OIDC Auth contract:", err);
      }
    };

    setupContract();
  }, [near, nearAccountId, oidcAuthContract]);

  return {
    contract,
    error,
    isLoading: isLoading || !contract,
  };
};
