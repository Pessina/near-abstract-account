"use client"

import { PlusIcon, MinusIcon, RefreshCwIcon, TrashIcon, AlertTriangleIcon } from "lucide-react"
import React, { useCallback, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { StorageBalance } from "@/contracts/AbstractAccountContract/AbstractAccountContract"
import { useAbstractAccountContract } from "@/contracts/AbstractAccountContract/useAbstractAccountContract"
import { useEnv } from "@/hooks/useEnv"
import { ONE_YOCTO_NEAR } from "@/lib/constants"

export default function ContractBalanceManagement() {
    const [amount, setAmount] = useState("")
    const [balance, setBalance] = useState<StorageBalance | null>(null)
    const { nearAccountId: accountId } = useEnv()
    const { contract } = useAbstractAccountContract()

    const loadBalance = useCallback(async () => {
        if (!contract) return
        const storageBalance = await contract.storageBalanceOf({
            account_id: accountId,
        })
        setBalance(storageBalance)
    }, [accountId, contract])

    const handleDeposit = async () => {
        if (!contract || !amount) return
        try {
            await contract.storageDeposit({
                args: {
                    account_id: accountId,
                    registration_only: false,
                },
                amount: amount,
            })
            await loadBalance()
            setAmount("")
        } catch (error) {
            console.error("Error depositing:", error)
        }
    }

    const handleWithdraw = async () => {
        if (!contract || !amount) return
        try {
            await contract.storageWithdraw({
                args: {
                    amount: amount,
                },
                amount: ONE_YOCTO_NEAR,
            })
            await loadBalance()
            setAmount("")
        } catch (error) {
            console.error("Error withdrawing:", error)
        }
    }

    const handleUnregister = async (force: boolean = false) => {
        if (!contract) return
        try {
            await contract.storageUnregister({
                args: {
                    force,
                },
            })
            setBalance(null)
        } catch (error) {
            console.error("Error unregistering:", error)
        }
    }

    React.useEffect(() => {
        loadBalance()
    }, [loadBalance])

    if (!contract) {
        return <div>Loading...</div>
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Storage Balance Management</CardTitle>
                <CardDescription>
                    Manage your storage balance for this contract
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex flex-col space-y-4">
                    <div className="flex items-center space-x-2">
                        <div className="flex-grow">
                            <Input
                                type="number"
                                step="0.1"
                                min="0"
                                placeholder="Amount in NEAR"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full"
                            />
                        </div>
                        <div className="flex space-x-2">
                            <Button onClick={handleDeposit} className="whitespace-nowrap">
                                <PlusIcon className="w-4 h-4 mr-2" />
                                Deposit
                            </Button>
                            <Button onClick={handleWithdraw} variant="secondary" className="whitespace-nowrap">
                                <MinusIcon className="w-4 h-4 mr-2" />
                                Withdraw
                            </Button>
                        </div>
                    </div>

                    <div className="p-4 bg-muted rounded-lg">
                        <h3 className="font-semibold mb-2">Current Balance</h3>
                        {balance ? (
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Total:</span>
                                    <span className="font-medium">{balance.total} NEAR</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Available:</span>
                                    <span className="font-medium">{balance.available} NEAR</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-muted-foreground italic">Not registered</div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button onClick={loadBalance} variant="outline" className="flex-grow sm:flex-grow-0">
                            <RefreshCwIcon className="w-4 h-4 mr-2" />
                            Refresh Balance
                        </Button>
                        <div className="w-full sm:w-auto flex gap-2 flex-grow justify-end">
                            <Button
                                onClick={() => handleUnregister(false)}
                                variant="destructive"
                                className="flex-grow sm:flex-grow-0"
                            >
                                <TrashIcon className="w-4 h-4 mr-2" />
                                Unregister
                            </Button>
                            <Button
                                onClick={() => handleUnregister(true)}
                                variant="destructive"
                                className="flex-grow sm:flex-grow-0"
                            >
                                <AlertTriangleIcon className="w-4 h-4 mr-2" />
                                Force Unregister
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
