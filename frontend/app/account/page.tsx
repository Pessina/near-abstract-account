"use client"

import React, { useState } from "react"

import { AuthAdapter, AuthConfig } from "../_utils/AuthAdapter"

import { useAccount } from "@/app/_providers/AccountContext"
import AccountInfo from "@/components/AccountInfo"
import { MetaMaskIcon, PasskeyIcon, PhantomIcon } from "@/components/AuthIcons"
import AuthModal from "@/components/AuthModal"
import FacebookButton from "@/components/FacebookButton"
import GoogleButton from "@/components/GoogleButton"
import Header from "@/components/Header"
import IdentitiesList from "@/components/IdentitiesList"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Transaction, Identity } from "@/contracts/AbstractAccountContract/types/transaction"
import { AbstractAccountContractBuilder } from "@/contracts/AbstractAccountContract/utils/auth"
import { useToast } from "@/hooks/use-toast"
import { useAccountData } from "@/hooks/useAccountData"
import { useEnv } from "@/hooks/useEnv"
import { parseOIDCToken } from "@/lib/utils"

export default function AccountPage() {
    const [authModalOpen, setAuthModalOpen] = useState(false)
    const [authProps, setAuthProps] = useState<{ accountId: string, transaction: Transaction } | null>(null)

    const { accountId } = useAccount()
    const { googleClientId, facebookAppId } = useEnv()
    const { toast } = useToast()
    const {
        account,
        identities,
        isLoading,
    } = useAccountData()

    if (isLoading || !account || !accountId) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">Loading account...</div>
            </div>
        )
    }

    const handleAddIdentity = async (config: AuthConfig) => {
        const authIdentity = await AuthAdapter.getIdentity(config)
        const transaction = AbstractAccountContractBuilder.transaction.addIdentity({
            accountId,
            nonce: account.nonce ?? 0,
            identity: authIdentity,
        })

        setAuthProps({
            accountId,
            transaction,

        })
        setAuthModalOpen(true)
    }

    const handleRemoveIdentity = async (identity: Identity) => {
        const transaction = AbstractAccountContractBuilder.transaction.removeIdentity({
            accountId,
            nonce: account.nonce ?? 0,
            identity,
        })

        setAuthProps({
            accountId,
            transaction,
        })
        setAuthModalOpen(true)
    }

    const handleDeleteAccount = async () => {
        const transaction = AbstractAccountContractBuilder.transaction.removeAccount({
            accountId,
            nonce: account.nonce ?? 0,
        })

        const authIdentity = account.identities[0]?.identity
        if (!authIdentity) {
            toast({
                title: "Error",
                description: "No identities found to authenticate with",
                variant: "destructive",
            })
            return
        }

        setAuthProps({
            accountId,
            transaction,

        })
        setAuthModalOpen(true)
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            {authProps && (
                <AuthModal
                    isOpen={authModalOpen}
                    onClose={() => {
                        setAuthModalOpen(false)
                        setAuthProps(null)
                    }}
                    {...authProps}
                />
            )}
            <main className="container mx-auto px-4 py-8">
                <div className="grid gap-8">
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-bold">Account Management</h1>
                    </div>
                    {account && <AccountInfo account={account} accountId={accountId} />}
                    <IdentitiesList
                        identities={identities || []}
                        onRemove={handleRemoveIdentity}
                    />
                    <Card>
                        <CardHeader>
                            <CardTitle>Add Authentication Method</CardTitle>
                            <CardDescription>
                                Add a new way to authenticate to your account
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-4">
                                <Button
                                    onClick={() => {
                                        handleAddIdentity({
                                            type: "webauthn",
                                            config: {
                                                username: accountId,
                                                operation: "create",
                                            },
                                        })
                                    }}
                                    variant="outline"
                                    className="w-full flex items-center justify-center gap-2"
                                >
                                    <PasskeyIcon />
                                    <span>Add Passkey</span>
                                </Button>

                                <div className="flex gap-4">
                                    <Button
                                        onClick={() => {
                                            handleAddIdentity({
                                                type: "wallet",
                                                config: {
                                                    wallet: "metamask",
                                                    type: "ethereum",
                                                },
                                            })
                                        }}
                                        variant="outline"
                                        className="flex-1 flex items-center justify-center gap-2"
                                    >
                                        <MetaMaskIcon />
                                        <span>Add MetaMask</span>
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            handleAddIdentity({
                                                type: "wallet",
                                                config: {
                                                    wallet: "phantom",
                                                    type: "solana",
                                                },
                                            })
                                        }}
                                        variant="outline"
                                        className="flex-1 flex items-center justify-center gap-2"
                                    >
                                        <PhantomIcon />
                                        <span>Add Phantom</span>
                                    </Button>
                                </div>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-gray-50 px-2 text-muted-foreground">
                                            Or continue with
                                        </span>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <GoogleButton
                                        nonce=""
                                        onSuccess={(idToken) => {
                                            const { issuer, email } = parseOIDCToken(idToken)
                                            handleAddIdentity({
                                                type: "oidc",
                                                config: {
                                                    clientId: googleClientId,
                                                    issuer,
                                                    email,
                                                    sub: null,
                                                    token: idToken
                                                }
                                            })
                                        }}
                                        onError={() => {
                                            toast({
                                                variant: "destructive",
                                                title: "Error",
                                                description: "Google authentication failed"
                                            })
                                        }}
                                    />
                                    <FacebookButton
                                        nonce=""
                                        text="Add Facebook"
                                        onSuccess={(idToken) => {
                                            const { issuer, email } = parseOIDCToken(idToken)
                                            handleAddIdentity({
                                                type: "oidc",
                                                config: {
                                                    clientId: facebookAppId,
                                                    issuer,
                                                    email,
                                                    sub: null,
                                                    token: idToken
                                                }
                                            })
                                        }}
                                        onError={(error) => {
                                            toast({
                                                variant: "destructive",
                                                title: "Error",
                                                description: error.message || "Facebook authentication failed"
                                            })
                                        }}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-red-600">Danger Zone</CardTitle>
                            <CardDescription>
                                These actions are irreversible. Please be certain.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                variant="destructive"
                                onClick={handleDeleteAccount}
                            >
                                Delete Account
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    )
}
