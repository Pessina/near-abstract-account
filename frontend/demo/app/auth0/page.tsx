"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import auth0 from "auth0-js";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { EVM, utils } from "signet.js";
import canonicalize from "canonicalize";
import { AbstractAccountContract } from "@/lib/contract/AbstractAccountContract";
import initNear from "@/lib/near";

interface TransactionForm {
  to: string;
  value: string;
}

const Auth0 = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<TransactionForm>();
  const [contract, setContract] = useState<AbstractAccountContract | null>(null)

  useEffect(() => {
    const setupContract = async () => {
      try {
        const { account } = await initNear()
        const contractInstance = new AbstractAccountContract({
          account,
          contractId: process.env.NEXT_PUBLIC_ABSTRACT_ACCOUNT_CONTRACT as string
        })

        setContract(contractInstance)
      } catch (error) {
        console.error("Failed to initialize contract:", error)
      }
    }

    setupContract()
  }, [])

  const chainSigContract = useMemo(() => new utils.chains.near.ChainSignatureContract({
    contractId: process.env.NEXT_PUBLIC_SIGNER_CONTRACT as string,
    networkId: process.env.NEXT_PUBLIC_NETWORK_ID as "testnet" | "mainnet",
  }), []);

  const evmChain = useMemo(() => new EVM({
    rpcUrl: process.env.NEXT_PUBLIC_INFURA_RPC_URL as string,
    contract: chainSigContract,
  }), []);

  const auth0Instance = useMemo(
    () =>
      new auth0.WebAuth({
        domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN as string,
        clientID: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID as string,
      }),
    []
  );

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const idToken = params.get("id_token");

      if (idToken) {
        console.log("ID Token:", idToken);
        window.history.replaceState(null, "", window.location.pathname);
      }

      // contract?.sendTransaction({
      //   account_id: accountId,
      //   selected_auth_identity: undefined,
      //   auth: {
      //     auth_identity: {
      //       OIDC: {
      //         client_id: clientId,
      //         issuer: issuer,
      //         email: email,
      //       },
      //     },
      //     auth_data: {
      //       message: nonce,
      //       token: token,
      //     },
      //   },
      //   payloads: mockTransaction(),
      // })


    }
  }, []);

  const signOut = () => {
    auth0Instance.logout({
      returnTo: "http://localhost:3000/auth0",
    });
  };

  const onSubmit = async (data: TransactionForm) => {
    const { address } = await evmChain.deriveAddressAndPublicKey(
      process.env.NEXT_PUBLIC_NEAR_ACCOUNT_ID as string,
      "m",
    )

    const { transaction, mpcPayloads } = await evmChain.getMPCPayloadAndTransaction({
      from: address,
      to: data.to,
      value: data.value,
    })

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

    auth0Instance.authorize({
      nonce,
      redirectUri: "http://localhost:3000/auth0",
      responseType: "id_token",
      scope: "openid profile email",
    });
  };

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
        </CardFooter>
      </Card>
    </div>
  );
};

export default Auth0;

