import { useMemo } from "react";
import { chainAdapters } from "signet.js";

import { useChainSigContract } from "./useChainSigContract";

import { useEnv } from "@/hooks/useEnv";

export function useChains() {
  const { infuraRpcUrl } = useEnv();

  const { chainSigContract } = useChainSigContract();

  const chains = useMemo(() => {
    if (!chainSigContract) return null;

    return {
      evm: new chainAdapters.evm.EVM({
        rpcUrl: infuraRpcUrl,
        contract: chainSigContract,
      }),
      btc: new chainAdapters.btc.Bitcoin({
        network: "testnet",
        btcRpcAdapter: new chainAdapters.btc.BTCRpcAdapters.Mempool(
          "https://mempool.space/testnet/api"
        ),
        contract: chainSigContract,
      }),
      osmosis: new chainAdapters.cosmos.Cosmos({
        chainId: "osmo-test-5",
        contract: chainSigContract,
      }),
    };
  }, [chainSigContract, infuraRpcUrl]);

  return { chains, chainSigContract };
}
