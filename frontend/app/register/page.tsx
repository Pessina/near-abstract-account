"use client"

import React, { useState } from "react"
import { useForm } from "react-hook-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAbstractAccountContract } from "@/contracts/AbstractAccountContract/useAbstractAccountContract"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { handleOIDCRegister } from "@/app/_utils/oidc"
import { handleWalletRegister } from "../_utils/wallet"
import { handlePasskeyRegister } from "../_utils/webauthn"

type FormValues = {
    accountId: string
    authType: string
    clientId: string
    issuer: string
    email: string
    walletType: "ethereum" | "solana"
    publicKey: string
    keyId: string
}

export default function RegisterForm() {
    const [status, setStatus] = useState("")
    const { contract } = useAbstractAccountContract()

    const { register, watch, handleSubmit } = useForm<FormValues>({
        defaultValues: {
            accountId: "",
            authType: "OIDC",
            clientId: "",
            issuer: "",
            email: "",
            walletType: "ethereum",
            publicKey: "",
            keyId: ""
        }
    })

    const authType = watch("authType")

    if (!contract) {
        return <div>Loading...</div>
    }

    const onSubmit = async (data: FormValues) => {
        try {
            if (authType === "OIDC") {
                await handleOIDCRegister({
                    contract,
                    clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
                    issuer: "https://accounts.google.com",
                    email: data.email,
                    accountId: data.accountId
                })
            }
            if (authType === "Wallet") {
                const walletType = data.walletType === "ethereum" ?
                    "metamask" :
                    "phantom"

                await handleWalletRegister({
                    contract,
                    walletConfig: {
                        type: data.walletType,
                        wallet: walletType
                    },
                    accountId: data.accountId
                })
            }
            if (authType === "WebAuthn") {
                await handlePasskeyRegister({
                    contract,
                    username: data.accountId,
                    accountId: data.accountId
                })
            }
            setStatus("Registration successful!")
        } catch (error) {
            console.error(error)
            setStatus(`Error: ${(error as Error).message}`)
        }
    }

    return (
        <div className="flex justify-center items-center h-full">
            <Card className="w-full md:max-w-2xl">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-center">Register Account</CardTitle>
                    <CardDescription className="text-center">Create a new account with your preferred authentication method</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div>
                            <Label htmlFor="accountId">Account ID</Label>
                            <Input id="accountId" {...register("accountId")} />
                        </div>

                        <div>
                            <Label>Authentication Type</Label>
                            <Select defaultValue="OIDC" onValueChange={(value) => register("authType").onChange({ target: { value } })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select auth type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="OIDC">OIDC</SelectItem>
                                    <SelectItem value="Wallet">Wallet</SelectItem>
                                    <SelectItem value="WebAuthn">WebAuthn</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {authType === "OIDC" && (
                            <>
                                <div>
                                    <Label htmlFor="clientId">Client ID</Label>
                                    <Input id="clientId" {...register("clientId")} />
                                </div>
                                <div>
                                    <Label htmlFor="issuer">Issuer</Label>
                                    <Input id="issuer" {...register("issuer")} />
                                </div>
                                <div>
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" type="email" {...register("email")} />
                                </div>
                            </>
                        )}

                        {authType === "Wallet" && (
                            <>
                                <div>
                                    <Label>Wallet Type</Label>
                                    <Select defaultValue="ethereum" onValueChange={(value: "ethereum" | "solana") => register("walletType").onChange({ target: { value } })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select wallet type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ethereum">Ethereum</SelectItem>
                                            <SelectItem value="solana">Solana</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="publicKey">Public Key</Label>
                                    <Input id="publicKey" {...register("publicKey")} />
                                </div>
                            </>
                        )}

                        {authType === "WebAuthn" && (
                            <div>
                                <Label htmlFor="keyId">Key ID</Label>
                                <Input id="keyId" {...register("keyId")} />
                            </div>
                        )}

                        <Button type="submit" className="w-full">
                            Register Account
                        </Button>

                        {status && (
                            <div className="mt-6 p-4 bg-gray-100 rounded">
                                <p>{status}</p>
                            </div>
                        )}
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
