"use client"

import { useQueryClient } from "@tanstack/react-query"
import canonicalize from "canonicalize"
import { UserOperation, Transaction } from "chainsig-aa.js"
import { useState } from "react"

import AuthenticationButtons from "./AuthenticationButtons"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { useAbstractAccountContract } from "@/contracts/useAbstractAccountContract"
import { useToast } from "@/hooks/use-toast"
import { AuthConfig, AuthAdapter } from "@/lib/auth/AuthAdapter"
import { NEAR_MAX_GAS } from "@/lib/constants"

interface AuthModalProps {
    isOpen: boolean
    onClose: () => void
    accountId: string
    transaction: Transaction
    onSuccess?: (result?: unknown) => void
}

interface Permissions {
    enable_act_as: boolean
}

export default function AuthModal({
    isOpen,
    onClose,
    accountId,
    transaction,
    onSuccess,
}: AuthModalProps) {
    const [permissions, setPermissions] = useState<Permissions>({
        enable_act_as: false,
    })
    const { toast } = useToast()
    const { contract } = useAbstractAccountContract()
    const queryClient = useQueryClient()

    const canonicalizedTransaction = canonicalize(transaction)

    const handleAuth = async (config: AuthConfig) => {
        try {
            if (!contract) {
                throw new Error("Contract not initialized")
            }

            const { credentials, authIdentity } = await AuthAdapter.sign(transaction, config)

            const userOp: UserOperation = {
                transaction,
                auth: {
                    identity: authIdentity,
                    credentials
                }
            }

            const ret = await contract.auth({
                args: {
                    user_op: userOp
                },
                gas: NEAR_MAX_GAS,
                amount: "10", // TODO: Should be dynamic according to the contract current fee
                waitUntil: "EXECUTED_OPTIMISTIC"
            })

            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['account', accountId] }),
                queryClient.invalidateQueries({ queryKey: ['identities', accountId] })
            ])

            toast({
                title: "Success",
                description: "Transaction executed successfully",
            })

            onSuccess?.(ret)
            onClose()
        } catch (err) {
            console.error(err)
            throw err
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Authentication Required</DialogTitle>
                    <DialogDescription>
                        Please authenticate to proceed with the transaction
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <AuthenticationButtons onAuth={handleAuth} accountId={accountId} nonce={canonicalizedTransaction} />
                    <Separator className="my-4" />
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium">Identity Permissions</h4>
                        <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="act-as"
                                    checked={permissions.enable_act_as}
                                    onChange={(e) =>
                                        setPermissions(prev => ({ ...prev, enable_act_as: e.target.checked }))
                                    }
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <label htmlFor="act-as" className="text-sm">Enable Act As</label>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}