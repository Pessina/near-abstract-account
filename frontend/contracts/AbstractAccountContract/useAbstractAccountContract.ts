"use client";

import { useState, useEffect } from "react";

import { AbstractAccountContractClass } from "./AbstractAccountContract";

import { useEnv } from "@/hooks/useEnv";
import { useInitNear } from "@/hooks/useInitNear";

export const useAbstractAccountContract = () => {
  const [contract, setContract] = useState<AbstractAccountContractClass | null>(
    null
  );
  const { near, error, isLoading } = useInitNear();
  const { nearAccountId, abstractAccountContract } = useEnv();

  useEffect(() => {
    const setupContract = async () => {
      if (!near) return;

      try {
        const account = await near.account(nearAccountId);
        const contractInstance = new AbstractAccountContractClass({
          account,
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
