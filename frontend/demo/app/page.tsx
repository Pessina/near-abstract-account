"use client";

import { useState, useEffect } from "react";
import { WebAuthn } from "../lib/auth";
import { AbstractAccountContract } from "../lib/contract/AbstractAccountContract";
import initNear from "../lib/near";

export default function Home() {
  const [username, setUsername] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [status, setStatus] = useState("");
  const [contract, setContract] = useState<AbstractAccountContract>();
  const [authContractAddress, setAuthContractAddress] = useState("");
  const [isWebAuthnSupported, setIsWebAuthnSupported] = useState<boolean | null>(null);

  useEffect(() => {
    const init = async () => {
      setIsWebAuthnSupported(WebAuthn.isSupportedByBrowser());

      try {
        const { account } = await initNear();
        const contract = new AbstractAccountContract({
          account,
          contractId: process.env.NEXT_PUBLIC_ABSTRACT_ACCOUNT_CONTRACT as string
        });
        setContract(contract);
      } catch (error) {
        console.error("Failed to initialize contract:", error);
        setStatus("Failed to initialize contract");
      }
    };
    init();
  }, []);

  const handleAddAuthContract = async () => {
    try {
      if (!contract) {
        setStatus("Contract not initialized");
        return;
      }

      if (!authContractAddress) {
        setStatus("Please provide an auth contract address");
        return;
      }

      await contract.addAuthContract("webauthn", authContractAddress);
      setStatus("Auth contract added successfully!");
    } catch (error) {
      console.error(error);
      setStatus("Error adding auth contract: " + (error as Error).message);
    }
  };

  const handleRegister = async () => {
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

      // Combine x and y coordinates for the public key
      const fullPublicKey = credential.pubKey.x + credential.pubKey.y;
      setPublicKey(fullPublicKey);

      // Add public key to contract
      if (!contract) {
        setStatus("Contract not initialized");
        return;
      }

      await contract.addPublicKey(fullPublicKey);
      setStatus("Registration successful!");

    } catch (error) {
      console.error(error);
      setStatus("Error during registration: " + (error as Error).message);
    }
  };

  const handleAuthenticate = async () => {
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

      // Call contract auth method
      await contract.auth({
        auth: {
          auth_type: "webauthn",
          auth_data: {
            public_key: publicKey,
            webauthn_data: {
              signature: credential.signature,
              authenticator_data: credential.authenticatorData,
              client_data: JSON.stringify(credential.clientData)
            }
          }
        }
      });

      setStatus("Authentication successful!");

    } catch (error) {
      console.error(error);
      setStatus("Error during authentication: " + (error as Error).message);
    }
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
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block mb-2">Auth Contract Address:</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={authContractAddress}
              onChange={(e) => setAuthContractAddress(e.target.value)}
              className="flex-1 p-2 border rounded"
              placeholder="Enter auth contract address"
            />
            <button
              onClick={handleAddAuthContract}
              className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
            >
              Add Auth Contract
            </button>
          </div>
        </div>

        <div className="space-x-4">
          <button
            onClick={handleRegister}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Register
          </button>
          <button
            onClick={handleAuthenticate}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Authenticate
          </button>
        </div>

        {publicKey && (
          <div className="mt-4">
            <h2 className="font-bold">Generated Public Key:</h2>
            <p className="break-all bg-gray-100 p-2 rounded">{publicKey}</p>
          </div>
        )}

        {status && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <p>{status}</p>
          </div>
        )}
      </div>
    </div>
  );
}
