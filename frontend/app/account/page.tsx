"use client"

import React, { useState } from "react"

import { AuthAdapter, AuthConfig } from "../_utils/AuthAdapter"

import AuthButton from "@/components/AuthButton"
import AuthModal from "@/components/AuthModal"
import FacebookButton from "@/components/FacebookButton"
import GoogleButton from "@/components/GoogleButton"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AuthIdentity } from "@/contracts/AbstractAccountContract/AbstractAccountContract"
import { Transaction } from "@/contracts/AbstractAccountContract/types/transaction"
import { useAbstractAccountContract } from "@/contracts/AbstractAccountContract/useAbstractAccountContract"
import { AbstractAccountContractBuilder } from "@/contracts/AbstractAccountContract/utils/auth"
import { useEnv } from "@/hooks/useEnv"
import { parseOIDCToken } from "@/lib/utils"

export default function AccountPage() {
    const [accounts, setAccounts] = useState<string[]>([])
    const [selectedAccount, setSelectedAccount] = useState("")
    const [authIdentities, setAuthIdentities] = useState<AuthIdentity[]>([])
    const [authModalOpen, setAuthModalOpen] = useState(false)
    const [authProps, setAuthProps] = useState<{ accountId: string, transaction: Transaction } | null>(null)
    const [newAccountId, setNewAccountId] = useState("")
    const [authAction, setAuthAction] = useState<"register" | "add">("register")

    const { contract } = useAbstractAccountContract()
    const { googleClientId, facebookAppId } = useEnv()

    if (!contract) {
        return <div>Loading...</div>
    }

    const handleDeleteAccount = async (accountId: string) => {
        const transaction = AbstractAccountContractBuilder.transaction.removeAccount()
        setAuthProps({
            accountId,
            transaction
        })
        setAuthModalOpen(true)
    }

    const handleRemoveAuthIdentity = async (accountId: string, authIdentity: AuthIdentity) => {
        const transaction = AbstractAccountContractBuilder.transaction.removeAuthIdentity({
            authIdentity
        })
        setAuthProps({
            accountId,
            transaction
        })
        setAuthModalOpen(true)
    }

    const handleRegister = async ({
        config,
        accountId,
    }: {
        config: AuthConfig;
        accountId: string;
    }) => {
        const authIdentity = await AuthAdapter.getAuthIdentity(config);

        await contract.addAccount({
            args: {
                account_id: accountId,
                auth_identity: authIdentity
            }
        });

        await loadAccounts();
    }

    const handleAddAuthIdentity = async ({
        config,
        accountId,
    }: {
        config: AuthConfig;
        accountId: string;
    }) => {
        const authIdentity = await AuthAdapter.getAuthIdentity(config);
        const transaction = AbstractAccountContractBuilder.transaction.addAuthIdentity({
            authIdentity
        })

        setAuthProps({
            accountId,
            transaction
        })
        setAuthModalOpen(true)
    }

    const loadAccounts = async () => {
        const accountList = await contract.listAccountIds()
        setAccounts(accountList)
    }

    const loadAuthIdentities = async (accountId: string) => {
        const identities = await contract.listAuthIdentities({ account_id: accountId })

        if (!identities) {
            console.error("No identities found for account", accountId)
            return
        }

        setAuthIdentities(identities)
        setSelectedAccount(accountId)
    }

    return (
        <div className="flex justify-center items-center h-full">
            {authProps && (
                <AuthModal
                    isOpen={authModalOpen}
                    onClose={() => setAuthModalOpen(false)}
                    {...authProps}
                />
            )}
            <Card className="w-full md:max-w-2xl">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-center">Account Management</CardTitle>
                    <CardDescription className="text-center">Manage your accounts and authentication methods</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="border p-4 rounded">
                        <h3 className="text-lg font-semibold mb-4">Create New Account</h3>
                        <div className="space-y-4">
                            <Input
                                placeholder="Account ID"
                                value={newAccountId}
                                onChange={(e) => setNewAccountId(e.target.value)}
                            />
                            <Select onValueChange={(value) => setAuthAction(value as "register" | "add")}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select action" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="register">Register New Account</SelectItem>
                                    <SelectItem value="add">Add Auth Method</SelectItem>
                                </SelectContent>
                            </Select>

                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Passkey Authentication</h3>
                                <Button
                                    onClick={() => {
                                        const config = {
                                            type: "webauthn" as const,
                                            config: {
                                                username: newAccountId,
                                            },
                                        };
                                        if (authAction === "register") {
                                            handleRegister({
                                                config,
                                                accountId: newAccountId,
                                            });
                                        } else {
                                            handleAddAuthIdentity({
                                                config,
                                                accountId: newAccountId,
                                            });
                                        }
                                    }}
                                >
                                    {authAction === "register" ? "Register" : "Add"} with Passkey
                                </Button>
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Social Login</h3>
                                <div className="flex gap-2">
                                    <GoogleButton
                                        onSuccess={(idToken) => {
                                            const { email, issuer } = parseOIDCToken(idToken)
                                            const config = {
                                                type: "oidc" as const,
                                                config: {
                                                    clientId: googleClientId,
                                                    issuer: issuer,
                                                    email: email,
                                                    sub: null,
                                                },
                                            };
                                            if (authAction === "register") {
                                                handleRegister({
                                                    config,
                                                    accountId: newAccountId,
                                                });
                                            } else {
                                                handleAddAuthIdentity({
                                                    config,
                                                    accountId: newAccountId,
                                                });
                                            }
                                        }}
                                        onError={() => {
                                            console.error("Error with Google authentication")
                                        }}
                                    />
                                    <FacebookButton
                                        text={`${authAction === "register" ? "Register" : "Add"} with Facebook`}
                                        onSuccess={(idToken) => {
                                            const { email, issuer } = parseOIDCToken(idToken)
                                            const config = {
                                                type: "oidc" as const,
                                                config: {
                                                    clientId: facebookAppId,
                                                    issuer: issuer,
                                                    email: email,
                                                    sub: null,
                                                },
                                            };
                                            if (authAction === "register") {
                                                handleRegister({
                                                    config,
                                                    accountId: newAccountId,
                                                });
                                            } else {
                                                handleAddAuthIdentity({
                                                    config,
                                                    accountId: newAccountId,
                                                });
                                            }
                                        }}
                                        onError={() => {
                                            console.error("Error with Facebook authentication")
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Wallet Authentication</h3>
                                <div className="flex flex-wrap gap-4">
                                    <AuthButton
                                        onClick={() => {
                                            const config = {
                                                type: "wallet" as const,
                                                config: {
                                                    wallet: "metamask" as const,
                                                    type: "ethereum" as const,
                                                },
                                            };
                                            if (authAction === "register") {
                                                handleRegister({
                                                    config,
                                                    accountId: newAccountId,
                                                });
                                            } else {
                                                handleAddAuthIdentity({
                                                    config,
                                                    accountId: newAccountId,
                                                });
                                            }
                                        }}
                                        imageSrc="/metamask.svg"
                                        imageAlt="MetaMask logo"
                                        buttonText={`${authAction === "register" ? "Register" : "Add"} with MetaMask`}
                                    />
                                    <AuthButton
                                        onClick={() => {
                                            const config = {
                                                type: "wallet" as const,
                                                config: {
                                                    wallet: "phantom" as const,
                                                    type: "solana" as const,
                                                },
                                            };
                                            if (authAction === "register") {
                                                handleRegister({
                                                    config,
                                                    accountId: newAccountId,
                                                });
                                            } else {
                                                handleAddAuthIdentity({
                                                    config,
                                                    accountId: newAccountId,
                                                });
                                            }
                                        }}
                                        imageSrc="/sol.svg"
                                        imageAlt="Phantom logo"
                                        buttonText={`${authAction === "register" ? "Register" : "Add"} with Phantom`}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Existing Accounts</h3>
                        <Button onClick={loadAccounts} className="mb-4">
                            List Accounts
                        </Button>
                        <div className="space-y-2">
                            {accounts.map((accountId) => (
                                <div key={accountId} className="flex justify-between items-center p-2 border rounded">
                                    <span>{accountId}</span>
                                    <div className="space-x-2">
                                        <Button
                                            onClick={() => loadAuthIdentities(accountId)}
                                            variant="secondary"
                                        >
                                            View Auth Methods
                                        </Button>
                                        <Button
                                            onClick={() => handleDeleteAccount(accountId)}
                                            variant="destructive"
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {selectedAccount && (
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Auth Identities for {selectedAccount}</h3>
                            <div className="space-y-2">
                                {authIdentities.map((identity, index) => (
                                    <div key={index} className="flex justify-between items-center p-2 border rounded">
                                        <span>{JSON.stringify(identity)}</span>
                                        <Button
                                            onClick={() => handleRemoveAuthIdentity(selectedAccount, identity)}
                                            variant="destructive"
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
