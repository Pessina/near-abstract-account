import { useMemo } from "react";
import { contracts } from "signet.js";

import { useAbstractAccountContract } from "@/contracts/useAbstractAccountContract";
import { useEnv } from "@/hooks/useEnv";

export function useChainSigContract() {
  const { contract } = useAbstractAccountContract();
  const { networkId, signerContract } = useEnv();

  const chainSigContract = useMemo(() => {
    if (!contract) return null;

    return new contracts.near.ChainSignatureContract({
      networkId: networkId as "mainnet" | "testnet",
      contractId: signerContract,
    });
  }, [contract, networkId, signerContract]);

  return { chainSigContract };
}
