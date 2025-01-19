"use client"

import React, { useState } from "react"
import { useForm } from "react-hook-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { handlePasskeyAuthenticate } from "./_utils/webauthn"
import { handlePasskeyRegister } from "./_utils/webauthn"
import { handleWalletAuthenticate, handleWalletRegister } from "./_utils/ethereum"
import GoogleButton from "@/components/GoogleButton"
import FacebookButton from "@/components/FacebookButton"
import AuthButton from "@/components/AuthButton"
import GoogleProvider from "./_providers/GoogleProvider";
import { handleOIDCRegister, handleOIDCAuthenticate } from "./_utils/oidc"
import UpdateOIDCKeys from "./_components/UpdateOIDCKeys"
import { mockTransaction } from "@/lib/constants"
import canonicalize from "canonicalize"
import { useAbstractAccountContract } from "@/contracts/AbstractAccountContract/useAbstractAccountContract"

type FormValues = {
  username: string
}

export default function AuthDemo() {
  const [status, setStatus] = useState("")
  const [isPending, setIsPending] = useState(false)
  const { contract } = useAbstractAccountContract();

  const { register, watch } = useForm<FormValues>({
    defaultValues: {
      username: ""
    }
  })

  const username = watch("username")

  if (!contract) {
    return <div>Loading...</div>;
  }

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
                <div className="flex flex-col gap-4">
                  <Button
                    onClick={async () => {
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
                        const identities = await contract.listAuthIdentities({ account_id: username });
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
                  <UpdateOIDCKeys />
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
                <div className="flex gap-2">
                  <GoogleButton
                    onSuccess={(response) => {
                      handleOIDCRegister({
                        contract,
                        setStatus,
                        setIsPending,
                        token: response.credential || '',
                        clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
                        issuer: 'https://accounts.google.com',
                        email: 'fs.pessina@gmail.com',
                        accountId: username
                      });
                    }}
                  />
                  <GoogleButton
                    nonce={canonicalize({
                      Sign: mockTransaction(),
                    }) ?? ''}
                    onSuccess={(response) => {
                      handleOIDCAuthenticate({
                        contract,
                        setStatus,
                        setIsPending,
                        token: response.credential || '',
                        clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
                        issuer: 'https://accounts.google.com',
                        email: 'fs.pessina@gmail.com',
                        accountId: username,
                      });
                    }}
                  />
                </div>
                <div className="flex gap-2">
                  <FacebookButton
                    text="Register with Facebook"
                    onSuccess={(token) => {
                      handleOIDCRegister({
                        contract,
                        setStatus,
                        setIsPending,
                        token,
                        clientId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '',
                        issuer: 'https://www.facebook.com',
                        email: 'fs.pessina@gmail.com',
                        accountId: username
                      });
                    }}
                  />
                  <FacebookButton
                    nonce={canonicalize({
                      Sign: mockTransaction(),
                    }) ?? ''}
                    text="Authenticate with Facebook"
                    onSuccess={(token) => {
                      handleOIDCAuthenticate({
                        contract,
                        setStatus,
                        setIsPending,
                        token,
                        clientId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '',
                        issuer: 'https://www.facebook.com',
                        email: 'fs.pessina@gmail.com',
                        accountId: username,
                      });
                    }}
                  />
                </div>
              </div>
              <div className="space-y-4 md:col-span-2">
                <h3 className="text-lg font-semibold">Wallet Authentication</h3>
                <div className="flex flex-wrap gap-4">
                  <div className="flex gap-2">
                    <AuthButton
                      onClick={() => {
                        handleWalletRegister({
                          contract,
                          walletConfig: {
                            type: "ethereum",
                            wallet: "metamask",
                          },
                          accountId: username,
                        });
                      }}
                      imageSrc="/metamask.svg"
                      imageAlt="MetaMask logo"
                      buttonText="Register"
                      disabled={isPending}
                    />
                    <AuthButton
                      onClick={() => {
                        handleWalletAuthenticate({
                          contract,
                          walletConfig: {
                            type: "ethereum",
                            wallet: "metamask",
                          },
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
                        handleWalletRegister({
                          contract,
                          walletConfig: {
                            type: "ethereum",
                            wallet: "okx",
                          },
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
                        handleWalletAuthenticate({
                          contract,
                          walletConfig: {
                            type: "ethereum",
                            wallet: "okx",
                          },
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
                        handleWalletRegister({
                          contract,
                          walletConfig: {
                            type: "solana",
                            wallet: "phantom",
                          },
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
                        handleWalletAuthenticate({
                          contract,
                          walletConfig: {
                            type: "solana",
                            wallet: "phantom",
                          },
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