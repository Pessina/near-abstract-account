"use client";

import { useState, useEffect, useTransition } from "react";
import { WebAuthn } from "../lib/auth";
import { AbstractAccountContract } from "../lib/contract/AbstractAccountContract";
import initNear from "../lib/near";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import canonicalize from 'canonicalize';


export default function Home() {
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState("");
  const [authContractAddress, setAuthContractAddress] = useState("");
  const [isWebAuthnSupported, setIsWebAuthnSupported] = useState<boolean | null>(null);
  const [isPending, startTransition] = useTransition();
  const [contract, setContract] = useState<AbstractAccountContract | null>(null);

  useEffect(() => {
    setIsWebAuthnSupported(WebAuthn.isSupportedByBrowser());

    // Initialize NEAR and contract
    const setupContract = async () => {
      try {
        const { account } = await initNear();
        const contractInstance = new AbstractAccountContract({
          account,
          contractId: process.env.NEXT_PUBLIC_ABSTRACT_ACCOUNT_CONTRACT as string
        });
        setContract(contractInstance);
      } catch (error) {
        console.error("Failed to initialize contract:", error);
        setStatus("Failed to initialize contract");
      }
    };

    setupContract();
  }, []);

  const handleAddAuthContract = () => {
    startTransition(async () => {
      try {
        if (!contract) {
          setStatus("Contract not initialized");
          return;
        }

        if (!authContractAddress) {
          setStatus("Please provide an auth contract address");
          return;
        }

        await contract.setAuthContract("webauthn", authContractAddress);
        setStatus("Auth contract added successfully!");
      } catch (error) {
        console.error(error);
        setStatus("Error adding auth contract: " + (error as Error).message);
      }
    });
  };

  const handleRegister = () => {
    startTransition(async () => {
      try {
        // Check if WebAuthn is supported
        if (!WebAuthn.isSupportedByBrowser()) {
          setStatus("WebAuthn is not supported by this browser");
          return;
        }

        // Create WebAuthn credential
        const credential = await WebAuthn.create({ username });
        if (!credential) {
          setStatus("Failed to create credential");
          return;
        }

        // Add public key to contract
        if (!contract) {
          setStatus("Contract not initialized");
          return;
        }

        await contract.addPublicKey(credential.rawId, credential.compressedPublicKey);
        setStatus("Registration successful!");

      } catch (error) {
        console.error(error);
        setStatus("Error during registration: " + (error as Error).message);
      }
    });
  };

  const handleAuthenticate = () => {
    startTransition(async () => {
      try {
        const nonce = await contract?.getNonce()

        if (nonce === undefined) {
          setStatus("Failed to get nonce");
          return;
        }

        const transaction = {
          receiver_id: "v1.signer-prod.testnet",
          nonce: nonce.toString(),
          actions: [{
            Transfer: {
              deposit: "1000000000000000000000"
            }
          },
          {
            FunctionCall: {
              method_name: "sign",
              args: JSON.stringify({
                request: {
                  path: "ethereum,1",
                  payload: [
                    0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
                    0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
                    0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
                    0, 1
                  ],
                  key_version: 0
                }
              }),
              gas: "50000000000000",
              deposit: "250000000000000000000000"
            }
          }]
        };

        const canonical = canonicalize(transaction);
        const challenge = new TextEncoder().encode(canonical);
        const challengeHash = await crypto.subtle.digest('SHA-256', challenge);

        const credential = await WebAuthn.get(new Uint8Array(challengeHash));
        if (!credential) {
          setStatus("Failed to get credential");
          return;
        }

        if (!contract) {
          setStatus("Contract not initialized");
          return;
        }

        // Call contract auth method
        await contract.auth({
          auth: {
            auth_type: "webauthn",
            auth_data: {
              public_key_id: credential.rawId,
              webauthn_data: {
                signature: credential.signature,
                authenticator_data: credential.authenticatorData,
                client_data: JSON.stringify(credential.clientData)
              }
            }
          },
          transaction
        });

        setStatus("Authentication successful!");

      } catch (error) {
        console.error(error);
        setStatus("Error during authentication: " + (error as Error).message);
      }
    });
  };

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-8">WebAuthn Demo</h1>

      {isWebAuthnSupported === false && (
        <div className="p-4 bg-yellow-100 text-yellow-800 rounded">
          WebAuthn is not supported by this browser
        </div>
      )}

      <div className="space-y-6 max-w-md">
        <div>
          <label className="block mb-2">Username:</label>
          <Input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div>
          <label className="block mb-2">Auth Contract Address:</label>
          <div className="flex gap-2">
            <Input
              type="text"
              value={authContractAddress}
              onChange={(e) => setAuthContractAddress(e.target.value)}
              placeholder="Enter auth contract address"
            />
            <Button
              onClick={handleAddAuthContract}
              variant="secondary"
              disabled={isPending}
            >
              Add Auth Contract
            </Button>
          </div>
        </div>

        <div className="space-x-4">
          <Button
            onClick={handleRegister}
            variant="default"
            disabled={isPending}
          >
            Register
          </Button>
          <Button
            onClick={handleAuthenticate}
            variant="secondary"
            disabled={isPending}
          >
            Authenticate
          </Button>
        </div>
        {status && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <p>{status}</p>
          </div>
        )}
      </div>
    </div>
  );
}
