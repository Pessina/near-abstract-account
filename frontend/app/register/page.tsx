"use client"

import { useRouter } from "next/navigation"
import React, { useState } from "react"

import { AuthAdapter, AuthConfig } from "../../lib/auth/AuthAdapter"

import AuthenticationButtons from "@/components/AuthenticationButtons"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAbstractAccountContract } from "@/contracts/useAbstractAccountContract"
import { useAccount } from "@/providers/AccountContext"

export default function RegisterPage() {
    const [accountId, setAccountId] = useState("")
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const { contract } = useAbstractAccountContract()
    const { setAccountId: setContextAccountId } = useAccount()

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
                    <AuthenticationButtons onAuth={handleRegister} accountId={accountId} mode="register" nonce="" />
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