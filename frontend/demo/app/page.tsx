"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AbstractAccountContract } from "@/lib/contract/AbstractAccountContract"
import initNear from "@/lib/near"
import { WebAuthn } from "@/lib/auth"
import { FaGoogle, FaFacebook, FaTwitter, FaBitcoin } from "react-icons/fa"
import Image from "next/image"
import canonicalize from 'canonicalize'

export default function AuthDemo() {
  const [contract, setContract] = useState<AbstractAccountContract | null>(null)
  const [username, setUsername] = useState("")
  const [status, setStatus] = useState("")
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    const setupContract = async () => {
      try {
        const { account } = await initNear()
        const contractInstance = new AbstractAccountContract({
          account,
          contractId: process.env.NEXT_PUBLIC_ABSTRACT_ACCOUNT_CONTRACT as string
        })

        // Initialize the auth contract
        await contractInstance.setAuthContract('webauthn', "felipe-webauthn.testnet")

        setContract(contractInstance)
      } catch (error) {
        console.error("Failed to initialize contract:", error)
        setStatus("Failed to initialize contract")
      }
    }

    setupContract()
  }, [])

  const handlePasskeyRegister = async () => {
    setIsPending(true)
    try {
      if (!WebAuthn.isSupportedByBrowser()) {
        setStatus("WebAuthn is not supported by this browser")
        return
      }

      const credential = await WebAuthn.create({ username })
      if (!credential || !contract) {
        setStatus("Failed to create credential or initialize contract")
        return
      }

      await contract.addPublicKey(credential.rawId, credential.compressedPublicKey)
      setStatus("Passkey registration successful!")
    } catch (error) {
      console.error(error)
      setStatus(`Error during registration: ${(error as Error).message}`)
    } finally {
      setIsPending(false)
    }
  }

  const handlePasskeyAuthenticate = async () => {
    setIsPending(true)
    try {
      const nonce = await contract?.getNonce()
      if (nonce === undefined || !contract) {
        setStatus("Failed to get nonce or initialize contract")
        return
      }

      const transaction = {
        receiver_id: "v1.signer-prod.testnet",
        nonce: nonce.toString(),
        actions: [
          { Transfer: { deposit: "1000000000000000000000" } },
          {
            FunctionCall: {
              method_name: "sign",
              args: JSON.stringify({
                request: {
                  path: "ethereum,1",
                  payload: Array(32).fill(0).map((_, i) => i % 10),
                  key_version: 0
                }
              }),
              gas: "50000000000000",
              deposit: "250000000000000000000000"
            }
          }
        ]
      }

      const canonical = canonicalize(transaction)
      const challenge = new TextEncoder().encode(canonical)
      const challengeHash = await crypto.subtle.digest('SHA-256', challenge)

      const credential = await WebAuthn.get(new Uint8Array(challengeHash))
      if (!credential) {
        setStatus("Failed to get credential")
        return
      }

      // Test code for signature
      // credential.signature.r = "0x573a2aba62db8a60c0877a87a2c6db9637bba0b7d8fd505628947e763371c016"

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
      })

      setStatus("Passkey authentication successful!")
    } catch (error) {
      console.error(error)
      setStatus(`Error during authentication: ${(error as Error).message}`)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="flex justify-center items-center h-full">
      <Card className="w-full md:max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Multi-Auth Demo</CardTitle>
          <CardDescription className="text-center">Choose an authentication method to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Passkey Authentication</h3>
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                />
              </div>
              <div className="flex space-x-4">
                <Button onClick={handlePasskeyRegister} disabled={isPending}>
                  Register Passkey
                </Button>
                <Button onClick={handlePasskeyAuthenticate} variant="secondary" disabled={isPending}>
                  Authenticate with Passkey
                </Button>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Social Login</h3>
              <Button
                onClick={() => console.log("Google Auth")}
                className="w-full flex items-center justify-center gap-2"
                variant="outline"
              >
                <FaGoogle className="w-5 h-5" />
                <span>Sign in with Google</span>
              </Button>
              <Button
                onClick={() => console.log("Facebook Auth")}
                className="w-full flex items-center justify-center gap-2"
                variant="outline"
              >
                <FaFacebook className="w-5 h-5" />
                <span>Sign in with Facebook</span>
              </Button>
              <Button
                onClick={() => console.log("Twitter Auth")}
                className="w-full flex items-center justify-center gap-2"
                variant="outline"
              >
                <FaTwitter className="w-5 h-5" />
                <span>Sign in with Twitter</span>
              </Button>
            </div>
            <div className="space-y-4 md:col-span-2">
              <h3 className="text-lg font-semibold">Wallet Authentication</h3>
              <div className="flex flex-wrap gap-4">
                <Button
                  onClick={() => console.log("Connect MetaMask")}
                  className="flex items-center justify-center gap-2"
                  variant="outline"
                >
                  <Image
                    src="/metamask-fox.svg"
                    alt="MetaMask logo"
                    width={24}
                    height={24}
                  />
                  <span>Connect MetaMask</span>
                </Button>
                <Button
                  onClick={() => console.log("Connect BTC Wallet")}
                  className="flex items-center justify-center gap-2"
                  variant="outline"
                >
                  <FaBitcoin className="w-5 h-5 text-orange-500" />
                  <span>Connect BTC Wallet</span>
                </Button>
              </div>
            </div>
          </div>
          {status && (
            <div className="mt-6 p-4 bg-gray-100 rounded">
              <p>{status}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}