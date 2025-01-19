"use client";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import auth0 from "auth0-js";
import canonicalize from "canonicalize";
import { useCallback, useEffect, useMemo } from "react";
import { toBytes } from "viem";

export default function MotifPage() {
  const auth0Instance = useMemo(
    () =>
      new auth0.WebAuth({
        domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN as string,
        clientID: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID as string,
      }),
    []
  );

  const handleGetOpHash = async () => {
    try {
      // const encodedData = encodeFunctionData({
      //   abi: ABI,
      //   functionName: "setState",
      //   args: ["hello"],
      // });

      const accountId = process.env.NEXT_PUBLIC_ABSTRACT_ACCOUNT_CONTRACT
      const path = "fs.pessina@gmail.com,"

      const response = await fetch(
        "http://127.0.0.1:4000/api/signetwork.getOpHash",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            json: {
              userOp: {
                data: "0x",
                to: "0x4174678c78fEaFd778c1ff319D5D326701449b25",
                value: "10",
              },
              accountId,
              path,
            }
          }),
        }
      );

      const data = await response.json() as {
        result: {
          data: {
            json: {
              hash: string;
              request: {
                factory: string;
                factoryData: string;
                sender: string;
                nonce: string;
                callData: string;
                signature: string;
                paymaster: string;
                paymasterData: string;
                paymasterPostOpGasLimit: string;
                paymasterVerificationGasLimit: string;
                maxPriorityFeePerGas: string;
                maxFeePerGas: string;
                callGasLimit: string;
                verificationGasLimit: string;
                preVerificationGas: string;
              };
              entryPoint: string;
            }
          }
        }
      };

      window.localStorage.setItem("opRequest", JSON.stringify(data.result.data.json.request))
      window.localStorage.setItem("opEntryPoint", data.result.data.json.entryPoint)
      window.localStorage.setItem("opHash", data.result.data.json.hash)

      const nonce = canonicalize({
        contract_id: process.env.NEXT_PUBLIC_SIGNER_CONTRACT as string,
        payloads: [
          {
            path: "",
            payload: Array.from(toBytes(data.result.data.json.hash)),
            key_version: 0,
          },
        ],
      })

      if (!nonce) {
        throw new Error("Nonce is required")
      }

      window.localStorage.setItem("nonce", nonce)

      auth0Instance.authorize({
        nonce,
        redirectUri: "http://localhost:3000/motif",
        responseType: "id_token",
        scope: "openid profile email",
      });
    } catch (error) {
      console.error("Error getting op hash:", error);
    }
  };

  const processTransaction = useCallback(async (nonce: string, idToken: string) => {
    try {
      const request = window.localStorage.getItem("opRequest")
      const entryPoint = window.localStorage.getItem("opEntryPoint")
      const hash = window.localStorage.getItem("opHash")

      if (!request || !entryPoint) {
        throw new Error("Operation request or entry point is required")
      }

      const response = await fetch(
        "http://127.0.0.1:4000/api/signetwork.addSignatureToOp",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            json: {
              request,
              nonce,
              idToken,
              entryPoint,
              hash,
            }
          }),
        }
      );

      const data = await response.json();

      console.log(data)

    } catch (error) {
      console.error("Failed to process transaction:", error)
    }

    if (idToken) {
      console.log("ID Token:", idToken);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const idToken = params.get("id_token");

      const nonce = window.localStorage.getItem("nonce")

      if (!nonce || !idToken) {
        throw new Error("Nonce or ID Token is required")
      }

      processTransaction(nonce, idToken)
    }
  }, [processTransaction]);

  return (
    <div className="container mx-auto p-4 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Operation Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-4">
            <Button onClick={handleGetOpHash}>Get Operation Hash</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


