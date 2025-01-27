"use client"

import { useQueryClient } from "@tanstack/react-query"
import canonicalize from "canonicalize"
import { useState } from "react"

import AuthenticationButtons from "./AuthenticationButtons"
import FacebookButton from "./FacebookButton"
import GoogleButton from "./GoogleButton"

import { AuthConfig, AuthAdapter } from "@/app/_utils/AuthAdapter"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { UserOperation, Transaction } from "@/contracts/AbstractAccountContract/types/transaction"
import { useAbstractAccountContract } from "@/contracts/AbstractAccountContract/useAbstractAccountContract"
import { useToast } from "@/hooks/use-toast"
import { useEnv } from "@/hooks/useEnv"
import { NEAR_MAX_GAS } from "@/lib/constants"
import { parseOIDCToken } from "@/lib/utils"

interface AuthModalProps {
    isOpen: boolean
    onClose: () => void
    accountId: string
    transaction: Transaction
}

interface Permissions {
    enable_act_as: boolean
}

export default function AuthModal({
    isOpen,
    onClose,
    accountId,
    transaction,
}: AuthModalProps) {
    const [permissions, setPermissions] = useState<Permissions>({
        enable_act_as: false,
    })
    const { toast } = useToast()
    const { googleClientId, facebookAppId } = useEnv()
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

            await contract.auth({
                args: {
                    user_op: userOp
                },
                gas: NEAR_MAX_GAS,
                amount: "10"
            })

            // Invalidate queries to refetch account data
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['account', accountId] }),
                queryClient.invalidateQueries({ queryKey: ['identities', accountId] })
            ])

            onClose()
            toast({
                title: "Success",
                description: "Transaction executed successfully",
            })
        } catch (err) {
            toast({
                title: "Error",
                description: err instanceof Error ? err.message : "Transaction failed",
                variant: "destructive",
            })
        }
    }

    const handleSocialLogin = (token: string, provider: "google" | "facebook") => {
        const { issuer, email } = parseOIDCToken(token)
        handleAuth({
            type: "oidc",
            config: {
                clientId: provider === "google" ? googleClientId : facebookAppId,
                issuer,
                email,
                sub: null,
                token
            }
        })
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
                    <AuthenticationButtons onAuth={handleAuth} accountId={accountId} />

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                                Or continue with
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <GoogleButton
                            nonce={canonicalizedTransaction}
                            onSuccess={(token) => handleSocialLogin(token, "google")}
                            onError={() => toast({
                                title: "Error",
                                description: "Google authentication failed",
                                variant: "destructive",
                            })}
                        />
                        <FacebookButton
                            text="Continue with Facebook"
                            nonce={canonicalizedTransaction}
                            onSuccess={(token) => handleSocialLogin(token, "facebook")}
                            onError={(error) => toast({
                                title: "Error",
                                description: error.message || "Facebook authentication failed",
                                variant: "destructive",
                            })}
                        />
                    </div>

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
