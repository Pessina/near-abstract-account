"use client";

import { useState, useEffect } from "react";
import { KeyPair, Near, connect, keyStores } from "near-api-js";
import { useEnv } from "./useEnv";

interface NearState {
  near: Near | null;
  error: Error | null;
  isLoading: boolean;
}

export const useInitNear = () => {
  const [state, setState] = useState<NearState>({
    near: null,
    error: null,
    isLoading: true,
  });

  const { nearAccountId, nearPrivateKey, networkId } = useEnv();

  useEffect(() => {
    const init = async () => {
      try {
        // Setup keystore
        const keyPair = KeyPair.fromString(nearPrivateKey);
        const keyStore = new keyStores.InMemoryKeyStore();
        await keyStore.setKey(networkId, nearAccountId, keyPair);

        // Configure network
        const config = {
          networkId,
          nodeUrl:
            networkId === "mainnet"
              ? "https://free.rpc.fastnear.com"
              : "https://test.rpc.fastnear.com",
          keyStore,
        };

        const near = await connect(config);

        setState({
          near,
          error: null,
          isLoading: false,
        });
      } catch (error) {
        setState({
          near: null,
          error: error as Error,
          isLoading: false,
        });
      }
    };

    init();
  }, [nearAccountId, nearPrivateKey, networkId]);

  return state;
};
