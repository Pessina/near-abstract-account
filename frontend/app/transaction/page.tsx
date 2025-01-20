"use client"

import React, { useState } from "react"
import { useForm } from "react-hook-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAbstractAccountContract } from "@/contracts/AbstractAccountContract/useAbstractAccountContract"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AuthIdentity } from "@/contracts/AbstractAccountContract/AbstractAccountContract"
import { AbstractAccountContractBuilder } from "@/contracts/AbstractAccountContract/utils/auth"
import { Transaction } from "@/contracts/AbstractAccountContract/types/transaction"
import { WalletType as AuthIdentityWalletType } from "@/contracts/AbstractAccountContract/types/auth"
import AuthModal from "@/app/transaction/_components/AuthModal"

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

type FormValues = {
    accountId: string
    transactionType: string
    contractId: string
    to: string
    value: string
    authIdentityType: string
    clientId: string
    issuer: string
    email: string
    walletType: string
    keyId: string
    publicKey: string
}

type AuthProps = {
    accountId: string
    transaction: Transaction
}

export default function TransactionForm() {
    const [authProps, setAuthProps] = useState<AuthProps | null>(null)
    const [authModalOpen, setAuthModalOpen] = useState(false)

    const { contract } = useAbstractAccountContract()
    const { register, watch, handleSubmit, setValue } = useForm<FormValues>({
        defaultValues: {
            accountId: "",
            transactionType: "",
            contractId: "",
            to: "",
            value: "",
            authIdentityType: "",
            clientId: "",
            issuer: "",
            email: "",
            walletType: "",
            keyId: "",
            publicKey: "",
        }
    })

    const transactionType = watch("transactionType")

    if (!contract) {
        return <div>Loading...</div>
    }

    const onSubmit = async (data: FormValues) => {
        const transaction = buildTransaction(data)
        setAuthProps({ accountId: data.accountId, transaction })
        setAuthModalOpen(true)
    }

    console.log({ transactionType })

    return (
        <div className="flex justify-center items-center h-full">
            {authProps && <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} {...authProps} />}
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
                            <Select defaultValue="Sign"
                                onValueChange={(value) => {
                                    console.log({ value })
                                    setValue("transactionType", value)
                                }}>
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
                                    <Label htmlFor="to">To</Label>
                                    <Input id="to" {...register("to")} />
                                </div>
                                <div>
                                    <Label htmlFor="value">Value</Label>
                                    <Input id="value" {...register("value")} />
                                </div>
                            </>
                        )}
                        {transactionType === "RemoveAccount" && (
                            <div className="text-sm text-muted-foreground">
                                This will remove the account. No additional parameters needed.
                            </div>
                        )}
                        {transactionType === "AddAuthIdentity" && (
                            <>
                                <div>
                                    <Label>Auth Type</Label>
                                    <Select onValueChange={(value) => setValue("authIdentityType", value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select auth type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="OIDC">OIDC</SelectItem>
                                            <SelectItem value="WebAuthn">WebAuthn</SelectItem>
                                            <SelectItem value="Wallet">Wallet</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {watch("authIdentityType") === "OIDC" && (
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
                                            <Input id="email" {...register("email")} />
                                        </div>
                                    </>
                                )}
                                {watch("authIdentityType") === "WebAuthn" && (
                                    <>
                                        <div>
                                            <Label htmlFor="keyId">Key ID</Label>
                                            <Input id="keyId" {...register("keyId")} />
                                        </div>
                                    </>
                                )}
                                {watch("authIdentityType") === "Wallet" && (
                                    <>
                                        <div>
                                            <Label>Wallet Type</Label>
                                            <Select onValueChange={(value) => setValue("walletType", value)}>
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
                            </>
                        )}
                        {transactionType === "RemoveAuthIdentity" && (
                            <>
                                <div>
                                    <Label>Auth Type</Label>
                                    <Select onValueChange={(value) => setValue("authIdentityType", value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select auth type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="OIDC">OIDC</SelectItem>
                                            <SelectItem value="WebAuthn">WebAuthn</SelectItem>
                                            <SelectItem value="Wallet">Wallet</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {watch("authIdentityType") === "OIDC" && (
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
                                            <Input id="email" {...register("email")} />
                                        </div>
                                    </>
                                )}
                                {watch("authIdentityType") === "WebAuthn" && (
                                    <>
                                        <div>
                                            <Label htmlFor="keyId">Key ID</Label>
                                            <Input id="keyId" {...register("keyId")} />
                                        </div>
                                    </>
                                )}
                                {watch("authIdentityType") === "Wallet" && (
                                    <>
                                        <div>
                                            <Label>Wallet Type</Label>
                                            <Select onValueChange={(value) => setValue("walletType", value)}>
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
                            </>
                        )}
                        <Button type="submit" className="w-full">
                            Submit Transaction
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
