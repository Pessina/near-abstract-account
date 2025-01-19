"use client"

import React, { useState } from "react"
import { useForm } from "react-hook-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAbstractAccountContract } from "@/contracts/AbstractAccountContract/useAbstractAccountContract"
import { AuthIdentity } from "@/contracts/AbstractAccountContract/AbstractAccountContract"
import { Transaction } from "@/contracts/AbstractAccountContract/types/transaction"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { WalletType as AuthIdentityWalletType } from "@/contracts/AbstractAccountContract/types/auth"
import { AbstractAccountContractBuilder } from "@/contracts/AbstractAccountContract/utils/auth"
import GoogleButton from "@/components/GoogleButton"
import FacebookButton from "@/components/FacebookButton"

type FormValues = {
    accountId: string
    transactionType: string
    contractId: string
    authIdentityType: string
    clientId: string
    issuer: string
    email: string
    walletType: string
    publicKey: string
    keyId: string
    token: string
    value: string
}

export default function TransactionForm() {
    const [status, setStatus] = useState("")
    const [isPending, setIsPending] = useState(false)
    const { contract } = useAbstractAccountContract()

    const { register, watch, handleSubmit } = useForm<FormValues>({
        defaultValues: {
            accountId: "",
            transactionType: "Sign",
            contractId: "",
            authIdentityType: "OIDC",
            clientId: "",
            issuer: "",
            email: "",
            walletType: "Ethereum",
            publicKey: "",
            keyId: ""
        }
    })

    const transactionType = watch("transactionType")
    const authIdentityType = watch("authIdentityType")

    if (!contract) {
        return <div>Loading...</div>
    }

    const buildAuthIdentity = (data: FormValues): AuthIdentity => {
        switch (data.authIdentityType) {
            case "OIDC":
                return AbstractAccountContractBuilder.authIdentity.oidc({
                    client_id: data.clientId,
                    issuer: data.issuer,
                    email: data.email
                })
            case "Wallet":
                return AbstractAccountContractBuilder.authIdentity.wallet({
                    wallet_type: data.walletType as AuthIdentityWalletType,
                    public_key: data.publicKey
                })
            case "WebAuthn":
                return AbstractAccountContractBuilder.authIdentity.webauthn({
                    key_id: data.keyId
                })
            default:
                return {
                    Account: data.accountId
                }
        }
    }

    const buildTransaction = (data: FormValues): Transaction => {
        switch (data.transactionType) {
            case "Sign":
                return AbstractAccountContractBuilder.transaction.sign({
                    contractId: data.contractId,
                    payloads: []
                })
            case "RemoveAccount":
                return AbstractAccountContractBuilder.transaction.removeAccount()
            case "AddAuthIdentity":
                return AbstractAccountContractBuilder.transaction.addAuthIdentity({
                    authIdentity: buildAuthIdentity(data)
                })
            case "RemoveAuthIdentity":
                return AbstractAccountContractBuilder.transaction.removeAuthIdentity({
                    authIdentity: buildAuthIdentity(data)
                })
            default:
                throw new Error("Invalid transaction type")
        }
    }

    const onSubmit = async (data: FormValues) => {
        setIsPending(true)
        try {
            const transaction = buildTransaction(data)
            const authIdentity = buildAuthIdentity(data)

            await contract.auth({
                args: {
                    user_op: {
                        account_id: data.accountId,
                        auth: {
                            authenticator: authIdentity,
                            credentials: {} as any // Would need proper credentials here
                        },
                        transaction
                    }
                }
            })
            setStatus("Transaction successful!")
        } catch (error) {
            console.error(error)
            setStatus(`Error: ${(error as Error).message}`)
        } finally {
            setIsPending(false)
        }
    }

    const handleOIDCSuccess = (idToken: string) => {
        console.log(idToken)
    }

    const handleOIDCError = () => {
        console.log('OIDC error')
    }

    return (
        <div className="flex justify-center items-center h-full">
            <Card className="w-full md:max-w-2xl">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-center">Create Transaction</CardTitle>
                    <CardDescription className="text-center">Build and submit transactions to the contract</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div>
                            <Label htmlFor="accountId">Account ID</Label>
                            <Input id="accountId" {...register("accountId")} />
                        </div>

                        <div>
                            <Label>Transaction Type</Label>
                            <Select defaultValue="Sign" onValueChange={(value) => register("transactionType").onChange({ target: { value } })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select transaction type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Sign">Sign</SelectItem>
                                    <SelectItem value="RemoveAccount">Remove Account</SelectItem>
                                    <SelectItem value="AddAuthIdentity">Add Auth Identity</SelectItem>
                                    <SelectItem value="RemoveAuthIdentity">Remove Auth Identity</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {transactionType === "Sign" && (
                            <>
                                <div>
                                    <Label htmlFor="contractId">Contract ID</Label>
                                    <Input id="contractId" {...register("contractId")} />
                                </div>
                                <div>
                                    <Label htmlFor="token">Token</Label>
                                    <Input id="token" {...register("token")} />
                                </div>
                                <div>
                                    <Label htmlFor="value">Value</Label>
                                    <Input id="value" {...register("value")} />
                                </div>
                            </>
                        )}

                        <div>
                            <Label>Auth Identity Type</Label>
                            <Select defaultValue="OIDC" onValueChange={(value) => register("authIdentityType").onChange({ target: { value } })}>
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

                        {authIdentityType === "OIDC" && (
                            <div className="flex flex-col gap-2">
                                <GoogleButton onSuccess={handleOIDCSuccess} onError={handleOIDCError} />
                                <FacebookButton onSuccess={handleOIDCSuccess} onError={handleOIDCError} text="Sign with Facebook" />
                            </div>
                        )}

                        {authIdentityType === "Wallet" && (
                            <>
                                <div>
                                    <Label>Wallet Type</Label>
                                    <Select defaultValue="Ethereum" onValueChange={(value) => register("walletType").onChange({ target: { value } })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select wallet type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Ethereum">Ethereum</SelectItem>
                                            <SelectItem value="Solana">Solana</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="publicKey">Public Key</Label>
                                    <Input id="publicKey" {...register("publicKey")} />
                                </div>
                            </>
                        )}

                        {authIdentityType === "WebAuthn" && (
                            <div>
                                <Label htmlFor="keyId">Key ID</Label>
                                <Input id="keyId" {...register("keyId")} />
                            </div>
                        )}

                        <Button type="submit" disabled={isPending} className="w-full">
                            Submit Transaction
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
