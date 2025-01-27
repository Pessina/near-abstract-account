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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAbstractAccountContract } from "@/contracts/AbstractAccountContract/useAbstractAccountContract"
import { useEnv } from "@/hooks/useEnv"
import { parseOIDCToken } from "@/lib/utils"

export default function RegisterPage() {
    const [accountId, setAccountId] = useState("")
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const { contract } = useAbstractAccountContract()
    const { setAccountId: setContextAccountId } = useAccount()
    const { googleClientId, facebookAppId } = useEnv()

    if (!contract) {
        return <div>Loading...</div>
    }

    const handleRegister = async (config: AuthConfig) => {
        try {
            setError(null)
            if (!accountId.trim()) {
                setError("Please enter an account ID")
                return
            }

            const existingAccount = await contract.getAccountById({ account_id: accountId })
            if (existingAccount) {
                setError("This account ID is already taken")
                return
            }

            const authIdentity = await AuthAdapter.getIdentity(config)

            await contract.addAccount({
                args: {
                    account_id: accountId,
                    identity_with_permissions: {
                        identity: authIdentity,
                        permissions: null
                    }
                }
            })

            const newAccount = await contract.getAccountById({ account_id: accountId })
            if (newAccount) {
                setContextAccountId(accountId)
                // Set session header for middleware
                document.cookie = "NEAR_ABSTRACT_ACCOUNT_SESSION=true; path=/"
                router.push("/account")
            }
        } catch (error) {
            console.error("Registration failed:", error)
            setError("Registration failed. Please try again.")
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">Create Account</CardTitle>
                    <CardDescription className="text-center">
                        Choose your account ID and authentication method
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="accountId">Account ID</Label>
                        <Input
                            id="accountId"
                            placeholder="Enter your desired account ID"
                            value={accountId}
                            onChange={(e) => setAccountId(e.target.value)}
                        />
                    </div>

                    <AuthenticationButtons onAuth={handleRegister} accountId={accountId} mode="register" />

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-gray-50 px-2 text-muted-foreground">
                                Or register with
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <GoogleButton
                            nonce=""
                            onSuccess={(idToken) => {
                                const { issuer, email } = parseOIDCToken(idToken)
                                handleRegister({
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
                            text="Register with Facebook"
                            nonce=""
                            onSuccess={(token) => {
                                const { issuer, email } = parseOIDCToken(token)
                                handleRegister({
                                    type: "oidc",
                                    config: {
                                        clientId: facebookAppId,
                                        issuer,
                                        email,
                                        sub: null,
                                        token
                                    }
                                })
                            }}
                            onError={(error) => {
                                const message = error.message || "Facebook authentication failed"
                                setError(message)
                            }}
                        />
                    </div>

                    <div className="text-center">
                        <Button
                            onClick={() => router.push("/login")}
                            variant="link"
                            className="text-sm"
                        >
                            Already have an account? Sign in
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
} 