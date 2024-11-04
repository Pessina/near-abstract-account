"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AbstractAccountContract } from "@/lib/contract/AbstractAccountContract"
import initNear from "@/lib/near"
import { FaGoogle, FaFacebook, FaTwitter, FaBitcoin } from "react-icons/fa"
import Image from "next/image"
import { handlePasskeyAuthenticate } from "./_utils/webauthn"
import { handlePasskeyRegister } from "./_utils/webauthn"
import { handleEthereumAuthenticate } from "./_utils/ethereum"
import { handleEthereumRegister } from "./_utils/ethereum"

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

        // Initialize the auth contracts
        await contractInstance.setAuthContract('webauthn', "felipe-webauthn.testnet")
        await contractInstance.setAuthContract('ethereum', "felipe-ethereum.testnet")

        setContract(contractInstance)
      } catch (error) {
        console.error("Failed to initialize contract:", error)
        setStatus("Failed to initialize contract")
      }
    }

    setupContract()
  }, [])

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
                <Button
                  onClick={() => {
                    if (!contract) return;
                    handlePasskeyRegister({
                      username,
                      contract,
                      setStatus,
                      setIsPending
                    });
                  }}
                  disabled={isPending}
                >
                  Register Passkey
                </Button>
                <Button
                  onClick={() => {
                    if (!contract) return;
                    handlePasskeyAuthenticate({
                      contract,
                      setStatus,
                      setIsPending
                    });
                  }}
                  variant="secondary"
                  disabled={isPending}
                >
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
                  onClick={() => {
                    if (!contract) return;
                    handleEthereumRegister({
                      contract,
                      setStatus,
                      setIsPending,
                      wallet: 'okx'
                    });
                  }}
                  className="flex items-center justify-center gap-2"
                  variant="outline"
                  disabled={isPending}
                >
                  <Image
                    src="/metamask.svg"
                    alt="MetaMask logo"
                    width={24}
                    height={24}
                  />
                  <span>Register MetaMask</span>
                </Button>
                <Button
                  onClick={() => {
                    if (!contract) return;
                    handleEthereumAuthenticate({
                      contract,
                      setStatus,
                      setIsPending,
                      wallet: 'okx'
                    });
                  }}
                  className="flex items-center justify-center gap-2"
                  variant="outline"
                  disabled={isPending}
                >
                  <Image
                    src="/metamask.svg"
                    alt="MetaMask logo"
                    width={24}
                    height={24}
                  />
                  <span>Authenticate with MetaMask</span>
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