"use client"

import React, { useState } from "react"
import { useForm } from "react-hook-form"

import AuthModal from "@/components/AuthModal"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Action, Identity, UserOperation } from "@/contracts/AbstractAccountContract/types/transaction"
import { useAbstractAccountContract } from "@/contracts/AbstractAccountContract/useAbstractAccountContract"
import { AbstractAccountContractBuilder } from "@/contracts/AbstractAccountContract/utils/auth"
import { useToast } from "@/hooks/use-toast"

type FormValues = {
    accountId: string;
    contractId: string;
    to: string;
    value: string;
    actAs: boolean;
    actAsIdentity?: string;
}

type AuthProps = {
    accountId: string;
    transaction: {
        account_id: string;
        nonce: number;
        action: Action;
    };
    userOp: UserOperation;
}

export default function TransactionForm() {
    const [authProps, setAuthProps] = useState<AuthProps | null>(null)
    const [authModalOpen, setAuthModalOpen] = useState(false)
    const [availableIdentities, setAvailableIdentities] = useState<Identity[]>([])

    const { contract } = useAbstractAccountContract()
    const { toast } = useToast()
    const { register, handleSubmit, watch, setValue } = useForm<FormValues>({
        defaultValues: {
            accountId: "",
            contractId: "",
            to: "",
            value: "",
            actAs: false,
        }
    })

    const actAs = watch("actAs")
    const accountId = watch("accountId")

    // Fetch available identities when account ID changes
    React.useEffect(() => {
        async function fetchIdentities() {
            if (!contract || !accountId) return;
            try {
                const account = await contract.getAccountById({ account_id: accountId });
                if (account) {
                    const identitiesWithActAs = account.identities.filter(
                        i => i.permissions?.enable_act_as
                    );
                    setAvailableIdentities(identitiesWithActAs.map(i => i.identity));
                }
            } catch (err) {
                toast({
                    title: "Error",
                    description: err instanceof Error ? err.message : "Failed to fetch account identities",
                    variant: "destructive",
                });
            }
        }
        fetchIdentities();
    }, [contract, accountId, toast]);

    if (!contract) {
        return <div>Loading...</div>
    }

    const onSubmit = async (data: FormValues) => {
        try {
            const account = await contract.getAccountById({ account_id: data.accountId })
            if (!account) {
                toast({
                    title: "Error",
                    description: "Account not found",
                    variant: "destructive",
                });
                return;
            }

            const transaction = AbstractAccountContractBuilder.transaction.sign({
                accountId: data.accountId,
                nonce: account.nonce,
                payloads: {
                    contract_id: data.contractId,
                    payloads: [{
                        path: "",
                        key_version: 0,
                        payload: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31] // 32 byte array
                    }]
                }
            });

            const userOp: UserOperation = {
                auth: {
                    identity: account.identities[0].identity,
                    credentials: {
                        token: "", // This will be filled by the auth process
                    },
                },
                transaction,
            };

            // If act-as is enabled and an identity is selected, add it to the transaction
            if (data.actAs && data.actAsIdentity) {
                const actAsIdentity = availableIdentities.find(
                    i => JSON.stringify(i) === data.actAsIdentity
                );
                if (actAsIdentity) {
                    userOp.act_as = actAsIdentity;
                }
            }

            setAuthProps({
                accountId: data.accountId,
                transaction: {
                    account_id: data.accountId,
                    nonce: account.nonce,
                    action: transaction.action,
                },
                userOp,
            })
            setAuthModalOpen(true)
        } catch (err) {
            toast({
                title: "Error",
                description: err instanceof Error ? err.message : "Failed to create transaction",
                variant: "destructive",
            });
        }
    }

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
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="actAs"
                                checked={actAs}
                                onChange={(e) => setValue("actAs", e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <Label htmlFor="actAs">Act as another identity</Label>
                        </div>
                        {actAs && availableIdentities.length > 0 && (
                            <div>
                                <Label htmlFor="actAsIdentity">Select Identity</Label>
                                <Select
                                    onValueChange={(value) => setValue("actAsIdentity", value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select an identity" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableIdentities.map((identity, index) => (
                                            <SelectItem
                                                key={index}
                                                value={JSON.stringify(identity)}
                                            >
                                                {getIdentityDisplayName(identity)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {actAs && availableIdentities.length === 0 && (
                            <div className="text-sm text-destructive">
                                No identities with act-as permission available
                            </div>
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

function getIdentityDisplayName(identity: Identity): string {
    if ("WebAuthn" in identity) {
        return `Passkey (${identity.WebAuthn.key_id.slice(0, 8)}...)`;
    }
    if ("OIDC" in identity) {
        const oidc = identity.OIDC;
        return `${oidc.issuer} (${oidc.email || oidc.sub})`;
    }
    if ("Wallet" in identity) {
        const wallet = identity.Wallet;
        return `${wallet.wallet_type} (${wallet.public_key.slice(0, 8)}...)`;
    }
    if ("Account" in identity) {
        return `Account (${identity.Account})`;
    }
    return "Unknown Identity";
}
