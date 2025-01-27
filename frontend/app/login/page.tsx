"use client"

import { useRouter } from "next/navigation"
import React, { useState } from "react"

import { AuthAdapter, AuthConfig } from "../_utils/AuthAdapter"

import { useAccount } from "@/app/_providers/AccountContext"
import AuthenticationButtons from "@/components/AuthenticationButtons"
import FacebookButton from "@/components/FacebookButton"
import GoogleButton from "@/components/GoogleButton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { useAbstractAccountContract } from "@/contracts/AbstractAccountContract/useAbstractAccountContract"
import { useEnv } from "@/hooks/useEnv"
import { parseOIDCToken } from "@/lib/utils"

export default function LoginPage() {
    const [accountSelectOpen, setAccountSelectOpen] = useState(false)
    const [availableAccounts, setAvailableAccounts] = useState<string[]>([])
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const { contract } = useAbstractAccountContract()
    const { setAccountId } = useAccount()
    const { googleClientId, facebookAppId } = useEnv()

    if (!contract) {
        return <div>Loading...</div>
    }

    const handleSelectAccount = async (selectedAccountId: string) => {
        try {
            const account = await contract.getAccountById({ account_id: selectedAccountId })
            if (account) {
                setAccountId(selectedAccountId)
                document.cookie = "NEAR_ABSTRACT_ACCOUNT_SESSION=true; path=/"
                router.push("/account")
            }
        } catch (error) {
            console.error("Failed to select account:", error)
            setError("Failed to select account")
        }
    }

    const handleLogin = async (config: AuthConfig) => {
        try {
            setError(null)
            const authIdentity = await AuthAdapter.getIdentity(config)
            const accounts = await contract.getAccountByIdentity({ identity: authIdentity })

            if (accounts.length === 0) {
                setError("No accounts found for this identity. Would you like to create a new account?")
                return
            }

            if (accounts.length === 1) {
                await handleSelectAccount(accounts[0])
            } else {
                setAvailableAccounts(accounts)
                setAccountSelectOpen(true)
            }
        } catch (error) {
            console.error("Login failed:", error)
            setError("Login failed. Please try again.")
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <Dialog open={accountSelectOpen} onOpenChange={setAccountSelectOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Select Account</DialogTitle>
                        <DialogDescription>
                            Multiple accounts found. Please select which one you want to use.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {availableAccounts.map((accountId) => (
                            <Button
                                key={accountId}
                                onClick={() => handleSelectAccount(accountId)}
                                variant="outline"
                            >
                                {accountId}
                            </Button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">Welcome Back</CardTitle>
                    <CardDescription className="text-center">
                        Sign in to your account using any of these methods
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <AuthenticationButtons onAuth={handleLogin} />

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
                                handleLogin({
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
                            onError={() => setError("Google authentication failed")}
                        />
                        <FacebookButton
                            text="Continue with Facebook"
                            nonce=""
                            onSuccess={(idToken) => {
                                const { issuer, email } = parseOIDCToken(idToken)
                                handleLogin({
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
                            onError={() => setError("Facebook authentication failed")}
                        />
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-gray-50 px-2 text-muted-foreground">
                                Or
                            </span>
                        </div>
                    </div>

                    <Button
                        onClick={() => router.push("/register")}
                        variant="outline"
                        className="w-full"
                    >
                        Create New Account
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
} 