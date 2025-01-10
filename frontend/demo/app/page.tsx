"use client"

import React, { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AbstractAccountContract } from "@/lib/contract/AbstractAccountContract"
import initNear from "@/lib/near"
import { handlePasskeyAuthenticate } from "./_utils/webauthn"
import { handlePasskeyRegister } from "./_utils/webauthn"
import { handleEthereumAuthenticate } from "./_utils/ethereum"
import { handleEthereumRegister } from "./_utils/ethereum"
import { handleSolanaAuthenticate, handleSolanaRegister } from "./_utils/solana"
import GoogleButton from "@/components/GoogleButton"
import FacebookButton from "@/components/FacebookButton"
import AuthButton from "@/components/AuthButton"
import GoogleProvider from "./_providers/GoogleProvider";


type FormValues = {
  username: string
}

export default function AuthDemo() {
  const [contract, setContract] = useState<AbstractAccountContract | null>(null)
  const [status, setStatus] = useState("")
  const [isPending, setIsPending] = useState(false)

  const { register, watch } = useForm<FormValues>({
    defaultValues: {
      username: ""
    }
  })

  const username = watch("username")

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
        setStatus("Failed to initialize contract")
      }
    }

    setupContract()
  }, [])

  return (
    <GoogleProvider>
      <div className="flex justify-center items-center h-full">
        <Card className="w-full md:max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Multi-Auth Demo</CardTitle>
            <CardDescription className="text-center">Choose an authentication method to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Account Management</h3>
                <div className="flex space-x-4">
                  <Button
                    onClick={async () => {
                      if (!contract) return;
                      try {
                        const accounts = await contract.listAccountIds();
                        setStatus(`Accounts: ${accounts.join(', ')}`);
                      } catch (error) {
                        setStatus(`Error listing accounts: ${error}`);
                      }
                    }}
                    disabled={isPending}
                  >
                    List Accounts
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!contract || !username) return;
                      try {
                        const identities = await contract.listAuthIdentities(username);
                        setStatus(`Auth identities for ${username}: ${JSON.stringify(identities)}`);
                      } catch (error) {
                        setStatus(`Error listing auth identities: ${error}`);
                      }
                    }}
                    variant="secondary"
                    disabled={isPending || !username}
                  >
                    List Auth Identities
                  </Button>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Passkey Authentication</h3>
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter username"
                    {...register("username")}
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
                        setIsPending,
                        accountId: username
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
                        setIsPending,
                        accountId: username
                      });
                    }}
                    variant="secondary"
                    disabled={isPending}
                  >
                    Authenticate with Passkey
                  </Button>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <h3 className="text-lg font-semibold">Social Login</h3>
                <GoogleButton />
                <FacebookButton />
              </div>
              <div className="space-y-4 md:col-span-2">
                <h3 className="text-lg font-semibold">Wallet Authentication</h3>
                <div className="flex flex-wrap gap-4">
                  <div className="flex gap-2">
                    <AuthButton
                      onClick={() => {
                        if (!contract) return;
                        handleEthereumRegister({
                          contract,
                          setStatus,
                          setIsPending,
                          wallet: 'metamask',
                          accountId: username
                        });
                      }}
                      imageSrc="/metamask.svg"
                      imageAlt="MetaMask logo"
                      buttonText="Register"
                      disabled={isPending}
                    />
                    <AuthButton
                      onClick={() => {
                        if (!contract) return;
                        handleEthereumAuthenticate({
                          contract,
                          setStatus,
                          setIsPending,
                          wallet: 'metamask',
                          accountId: username
                        });
                      }}
                      imageSrc="/metamask.svg"
                      imageAlt="MetaMask logo"
                      buttonText="Authenticate"
                      disabled={isPending}
                    />
                  </div>
                  <div className="flex gap-2">
                    <AuthButton
                      onClick={() => {
                        if (!contract) return;
                        handleEthereumRegister({
                          contract,
                          setStatus,
                          setIsPending,
                          wallet: 'okx',
                          accountId: username
                        });
                      }}
                      imageSrc="/okx.svg"
                      imageAlt="OKX logo"
                      buttonText="Register"
                      disabled={isPending}
                    />
                    <AuthButton
                      onClick={() => {
                        if (!contract) return;
                        handleEthereumAuthenticate({
                          contract,
                          setStatus,
                          setIsPending,
                          wallet: 'okx',
                          accountId: username
                        });
                      }}
                      imageSrc="/okx.svg"
                      imageAlt="OKX logo"
                      buttonText="Authenticate"
                      disabled={isPending}
                    />
                  </div>
                  <div className="flex gap-2">
                    <AuthButton
                      onClick={() => {
                        if (!contract) return;
                        handleSolanaRegister({
                          contract,
                          setStatus,
                          setIsPending,
                          wallet: 'phantom',
                          accountId: username
                        });
                      }}
                      imageSrc="/sol.svg"
                      imageAlt="Phantom logo"
                      buttonText="Register"
                      disabled={isPending}
                    />
                    <AuthButton
                      onClick={() => {
                        if (!contract) return;
                        handleSolanaAuthenticate({
                          contract,
                          setStatus,
                          setIsPending,
                          wallet: 'phantom',
                          accountId: username
                        });
                      }}
                      imageSrc="/sol.svg"
                      imageAlt="Phantom logo"
                      buttonText="Authenticate"
                      disabled={isPending}
                    />
                  </div>
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
    </GoogleProvider>
  )
}