"use client";

import { AbstractAccountContract } from "chainsig-aa.js";
import { useState, useEffect } from "react";

import { useEnv } from "@/hooks/useEnv";
import { useInitNear } from "@/hooks/useInitNear";

export const useAbstractAccountContract = () => {
  const [contract, setContract] = useState<AbstractAccountContract | null>(
    null
  );
  const { near, error, isLoading } = useInitNear();
  const { nearAccountId, abstractAccountContract } = useEnv();

  useEffect(() => {
    const setupContract = async () => {
      if (!near) return;

      try {
        const nearAccount = await near.account(nearAccountId);
        const contractInstance = new AbstractAccountContract({
          near,
          nearAccount,
          accountId: nearAccountId,
          contractId: abstractAccountContract,
        });
        setContract(contractInstance);
      } catch (err) {
        console.error("Failed to initialize contract:", err);
      }
    };

    setupContract();
  }, [near, abstractAccountContract, nearAccountId]);

  return {
    contract,
    error,
    isLoading,
  };
};
