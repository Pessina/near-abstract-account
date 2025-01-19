"use client"

import React from "react"
import { useForm } from "react-hook-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { handlePasskeyAuthenticate } from "./_utils/webauthn"
import { handlePasskeyRegister } from "./_utils/webauthn"
import { handleWalletAuthenticate, handleWalletRegister } from "./_utils/wallet"
import GoogleButton from "@/components/GoogleButton"
import FacebookButton from "@/components/FacebookButton"
import AuthButton from "@/components/AuthButton"
import { handleOIDCRegister, handleOIDCAuthenticate } from "./_utils/oidc"
import { mockTransaction } from "@/lib/constants"
import canonicalize from "canonicalize"
import { useAbstractAccountContract } from "@/contracts/AbstractAccountContract/useAbstractAccountContract"

type FormValues = {
  username: string
}

export default function AuthDemo() {
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
    <div className="flex justify-center items-center h-full">
      <Card className="w-full md:max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Multi-Auth Demo</CardTitle>
          <CardDescription className="text-center">Choose an authentication method to get started</CardDescription>
        </CardHeader>
        <CardContent>
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
                    accountId: username,
                  });
                }}
              >
                Register Passkey
              </Button>
              <Button
                onClick={() => {
                  handlePasskeyAuthenticate({
                    contract,
                    accountId: username,
                    transaction: mockTransaction(),
                  });
                }}
                variant="secondary"
              >
                Authenticate with Passkey
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-semibold">Social Login</h3>
            <div className="flex gap-2">
              <GoogleButton
                onSuccess={() => {
                  handleOIDCRegister({
                    contract,
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
                    token: response.credential || '',
                    clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
                    issuer: 'https://accounts.google.com',
                    email: 'fs.pessina@gmail.com',
                    accountId: username,
                    transaction: mockTransaction(),
                  });
                }}
              />
            </div>
            <div className="flex gap-2">
              <FacebookButton
                text="Register with Facebook"
                onSuccess={() => {
                  handleOIDCRegister({
                    contract,
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
                    token,
                    clientId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '',
                    issuer: 'https://www.facebook.com',
                    email: 'fs.pessina@gmail.com',
                    accountId: username,
                    transaction: mockTransaction(),
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
                />
                <AuthButton
                  onClick={() => {
                    handleWalletAuthenticate({
                      contract,
                      walletConfig: {
                        type: "ethereum",
                        wallet: "metamask",
                      },
                      accountId: username,
                      transaction: mockTransaction(),
                    });
                  }}
                  imageSrc="/metamask.svg"
                  imageAlt="MetaMask logo"
                  buttonText="Authenticate"
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
                      accountId: username,
                    });
                  }}
                  imageSrc="/okx.svg"
                  imageAlt="OKX logo"
                  buttonText="Register"
                />
                <AuthButton
                  onClick={() => {
                    handleWalletAuthenticate({
                      contract,
                      walletConfig: {
                        type: "ethereum",
                        wallet: "okx",
                      },
                      accountId: username,
                      transaction: mockTransaction(),
                    });
                  }}
                  imageSrc="/okx.svg"
                  imageAlt="OKX logo"
                  buttonText="Authenticate"
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
                      accountId: username,
                    });
                  }}
                  imageSrc="/sol.svg"
                  imageAlt="Phantom logo"
                  buttonText="Register"
                />
                <AuthButton
                  onClick={() => {
                    handleWalletAuthenticate({
                      contract,
                      walletConfig: {
                        type: "solana",
                        wallet: "phantom",
                      },
                      accountId: username,
                      transaction: mockTransaction(),
                    });
                  }}
                  imageSrc="/sol.svg"
                  imageAlt="Phantom logo"
                  buttonText="Authenticate"
                />
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