"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import auth0 from "auth0-js";
import { useCallback, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { EVM, RSVSignature, utils } from "signet.js";
import canonicalize from "canonicalize";
import { AbstractAccountContract } from "@/lib/contract/AbstractAccountContract";
import initNear from "@/lib/near";

interface TransactionForm {
  to: string;
  value: string;
}

const AA_ACCOUNT_ID = "felipe"

const AUTH_IDENTITY = {
  OIDC: {
    client_id: 'iApbopHWvSi84JgD7FPn23NowKle9UnR',
    issuer: 'https://dev-um3ne30lucm6ehqq.us.auth0.com/',
    email: 'fs.pessina@gmail.com',
  }
}

const storeNonce = (nonce: string) => {
  localStorage.setItem("nonce", nonce)
}

const getNonce = () => {
  return localStorage.getItem("nonce")
}

const Auth0 = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<TransactionForm>();

  const getContract = useCallback(async () => {
    const { account } = await initNear()
    return new AbstractAccountContract({
      account,
      contractId: process.env.NEXT_PUBLIC_ABSTRACT_ACCOUNT_CONTRACT as string
    })
  }, [])

  const chainSigContract = useMemo(() => new utils.chains.near.ChainSignatureContract({
    contractId: process.env.NEXT_PUBLIC_SIGNER_CONTRACT as string,
    networkId: process.env.NEXT_PUBLIC_NETWORK_ID as "testnet" | "mainnet",
  }), []);

  const evmChain = useMemo(() => new EVM({
    rpcUrl: process.env.NEXT_PUBLIC_INFURA_RPC_URL as string,
    contract: chainSigContract,
  }), [chainSigContract]);

  const auth0Instance = useMemo(
    () =>
      new auth0.WebAuth({
        domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN as string,
        clientID: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID as string,
      }),
    []
  );

  const processTransaction = useCallback(async (nonce: string, idToken: string) => {
    try {
      const contract = await getContract()
      const signature = await contract?.sendTransaction({
        account_id: AA_ACCOUNT_ID,
        selected_auth_identity: undefined,
        auth: {
          auth_identity: AUTH_IDENTITY,
          auth_data: {
            message: nonce,
            token: idToken,
          },
        },
        payloads: JSON.parse(nonce),
      })

      const rsvSignature: RSVSignature = utils.cryptography.toRSV(signature)

      const transaction = evmChain.getTransaction('transaction', { remove: true })

      if (!transaction) {
        throw new Error("Transaction not found")
      }

      const txHex = evmChain.addSignature({
        transaction,
        mpcSignatures: [rsvSignature],
      })

      const txHash = await evmChain.broadcastTx(txHex)

      console.log({ txHash })

    } catch (error) {
      console.error("Failed to process transaction:", error)
    }

    if (idToken) {
      console.log("ID Token:", idToken);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [evmChain, getContract]);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const idToken = params.get("id_token");

      const nonce = getNonce()

      if (!nonce || !idToken) {
        throw new Error("Nonce or ID Token is required")
      }

      processTransaction(nonce, idToken)
    }
  }, [processTransaction]);

  const signOut = () => {
    auth0Instance.logout({
      returnTo: "http://localhost:3000/auth0",
    });
  };

  const onSubmit = async (data: TransactionForm) => {
    const { address } = await evmChain.deriveAddressAndPublicKey(
      process.env.NEXT_PUBLIC_NEAR_ACCOUNT_ID as string,
      "",
    )

    const { transaction, mpcPayloads } = await evmChain.getMPCPayloadAndTransaction({
      from: address,
      to: data.to,
      value: data.value,
    })

    evmChain.setTransaction(transaction, 'transaction')

    const nonce = canonicalize({
      contract_id: process.env.NEXT_PUBLIC_SIGNER_CONTRACT as string,
      payloads: [
        {
          path: "",
          payload: mpcPayloads[0],
          key_version: 0,
        },
      ],
    })

    if (!nonce) {
      throw new Error("Nonce is required")
    }

    storeNonce(nonce)

    auth0Instance.authorize({
      nonce,
      redirectUri: "http://localhost:3000/auth0",
      responseType: "id_token",
      scope: "openid profile email",
    });

  };

  const addAuthMethod = async () => {
    const contract = await getContract()
    contract.addAccount(
      AA_ACCOUNT_ID,
      AUTH_IDENTITY
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-800 text-gray-100">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Transaction Form</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="to" className="text-sm font-medium text-gray-300">
                Recipient Address
              </label>
              <Input
                id="to"
                {...register("to", { required: "To address is required" })}
                placeholder="Enter recipient address"
                className="bg-gray-700 text-gray-100 border-gray-600 focus:border-blue-500"
              />
              {errors.to && (
                <Alert variant="destructive" className="bg-red-900 border-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{errors.to.message}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="value" className="text-sm font-medium text-gray-300">
                Value
              </label>
              <Input
                id="value"
                {...register("value", { required: "Value is required" })}
                placeholder="Enter amount"
                className="bg-gray-700 text-gray-100 border-gray-600 focus:border-blue-500"
              />
              {errors.value && (
                <Alert variant="destructive" className="bg-red-900 border-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{errors.value.message}</AlertDescription>
                </Alert>
              )}
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              Submit Transaction
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button onClick={signOut} variant="outline" className="bg-gray-700 text-gray-100 border-gray-600 hover:bg-gray-600">
            Sign Out
          </Button>
          <Button onClick={addAuthMethod} variant="outline" className="bg-gray-700 text-gray-100 border-gray-600 hover:bg-gray-600">
            Add Auth Method
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Auth0;

