"use client";

import { useState, useEffect, useTransition } from "react";
import { WebAuthn } from "../lib/auth";
import { AbstractAccountContract } from "../lib/contract/AbstractAccountContract";
import initNear from "../lib/near";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";

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
        // Get WebAuthn credential
        const credential = await WebAuthn.get();
        if (!credential) {
          setStatus("Failed to get credential");
          return;
        }

        if (!contract) {
          setStatus("Contract not initialized");
          return;
        }

        // Call contract auth method with example actions
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
          transaction: {
            receiver_id: "felipe-sandbox.testnet",
            actions: [{
              Transfer: {
                deposit: "1000000000000000000000"
              }
            }
              // {
              //   FunctionCall: {
              //     method_name: "example_method", 
              //     args: new TextEncoder().encode(JSON.stringify({ example: "data" })),
              //     gas: "30000000000000",
              //     deposit: "0"
              //   }
              // }
            ]
          }
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
