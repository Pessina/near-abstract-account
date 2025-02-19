"use client"

import { Transaction, Identity, AbstractAccountContractBuilder } from "chainsig-aa.js"
import React, { useState } from "react"

import { AuthAdapter, AuthConfig } from "../../lib/auth/AuthAdapter"

import AccountInfo from "@/app/account/components/AccountInfo"
import IdentitiesList from "@/app/account/components/IdentitiesList"
import AuthenticationButtons from "@/components/AuthenticationButtons"
import AuthModal from "@/components/AuthModal"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAccountData } from "@/hooks/useAccountData"
import { useAccount } from "@/providers/AccountContext"

export default function AccountPage() {
    const [authModalOpen, setAuthModalOpen] = useState(false)
    const [authProps, setAuthProps] = useState<{ accountId: string, transaction: Transaction } | null>(null)

    const { accountId } = useAccount()
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
            identity_with_permissions: {
                identity: authIdentity,
                permissions: {
                    enable_act_as: false,
                },
            },
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

        setAuthProps({
            accountId,
            transaction,
        })
        setAuthModalOpen(true)
    }

    return (
        <div className="min-h-screen bg-gray-50">
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
                            <AuthenticationButtons
                                onAuth={handleAddIdentity}
                                nonce=""
                                accountId={accountId}
                                mode="register"
                            />
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
