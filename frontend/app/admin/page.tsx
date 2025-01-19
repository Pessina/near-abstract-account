"use client"

import React, { useState } from "react"
import { useForm } from "react-hook-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import UpdateOIDCKeys from "./_components/UpdateOIDCKeys"
import { useAbstractAccountContract } from "@/contracts/AbstractAccountContract/useAbstractAccountContract"

type FormValues = {
    username: string
}

export default function AdminPage() {
    const [status, setStatus] = useState("")
    const { contract } = useAbstractAccountContract();

    const { register, watch } = useForm<FormValues>({
        defaultValues: {
            username: ""
        }
    })

    const username = watch("username")

    if (!contract) {
        return <div>Loading...</div>;
    }

    return (
        <div className="flex justify-center items-center h-full">
            <Card className="w-full md:max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-center">Admin Dashboard</CardTitle>
                    <CardDescription className="text-center">Manage accounts and authentication</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-6">
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Account Management</h3>
                            <div>
                                <Label htmlFor="username">Username</Label>
                                <Input
                                    id="username"
                                    type="text"
                                    placeholder="Enter username"
                                    {...register("username")}
                                />
                            </div>
                            <div className="flex flex-col gap-4">
                                <Button
                                    onClick={async () => {
                                        try {
                                            const accounts = await contract.listAccountIds();
                                            setStatus(`Accounts: ${accounts.join(', ')}`);
                                        } catch (error) {
                                            setStatus(`Error listing accounts: ${error}`);
                                        }
                                    }}
                                >
                                    List Accounts
                                </Button>
                                <Button
                                    onClick={async () => {
                                        if (!contract || !username) return;
                                        try {
                                            const identities = await contract.listAuthIdentities({ account_id: username });
                                            setStatus(`Auth identities for ${username}: ${JSON.stringify(identities)}`);
                                        } catch (error) {
                                            setStatus(`Error listing auth identities: ${error}`);
                                        }
                                    }}
                                    variant="secondary"
                                >
                                    List Auth Identities
                                </Button>
                                <UpdateOIDCKeys />
                            </div>
                        </div>
                        {status && (
                            <div className="mt-6 p-4 bg-gray-100 rounded">
                                <p>{status}</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
