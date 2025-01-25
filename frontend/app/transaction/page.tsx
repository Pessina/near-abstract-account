"use client"

import React, { useState } from "react"
import { useForm } from "react-hook-form"

import AuthModal from "@/components/AuthModal"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Transaction } from "@/contracts/AbstractAccountContract/AbstractAccountContract"
import { useAbstractAccountContract } from "@/contracts/AbstractAccountContract/useAbstractAccountContract"
import { AbstractAccountContractBuilder } from "@/contracts/AbstractAccountContract/utils/auth"

type FormValues = {
    accountId: string
    contractId: string
    to: string
    value: string
}

type AuthProps = {
    accountId: string
    transaction: Transaction
}

export default function TransactionForm() {
    const [authProps, setAuthProps] = useState<AuthProps | null>(null)
    const [authModalOpen, setAuthModalOpen] = useState(false)

    const { contract } = useAbstractAccountContract()
    const { register, handleSubmit } = useForm<FormValues>({
        defaultValues: {
            accountId: "",
            contractId: "",
            to: "",
            value: "",
        }
    })

    if (!contract) {
        return <div>Loading...</div>
    }

    const onSubmit = async (data: FormValues) => {
        const account = await contract.getAccountById({ account_id: data.accountId })
        const transaction = AbstractAccountContractBuilder.transaction.sign({
            accountId: data.accountId,
            nonce: account?.nonce ?? 0,
            payloads:
            {
                contract_id: data.contractId,
                payloads: [
                    {
                        path: "",
                        key_version: 0,
                        payload: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1]

                    }
                ]
            }
        })
        setAuthProps({ accountId: data.accountId, transaction })
        setAuthModalOpen(true)
    }

    return (
        <div className="flex justify-center items-center h-full">
            {authProps && <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} {...authProps} />}
            <Card className="w-full md:max-w-2xl">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-center">Create Sign Transaction</CardTitle>
                    <CardDescription className="text-center">Build and submit sign transactions to the contract</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div>
                            <Label htmlFor="accountId">Account ID</Label>
                            <Input id="accountId" {...register("accountId")} />
                        </div>
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
                        <Button type="submit" className="w-full">
                            Submit Transaction
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
