"use client"

import canonicalize from "canonicalize"
import React from "react"

import { AuthAdapter } from "@/app/_utils/AuthAdapter"
import AuthButton from "@/components/AuthButton"
import FacebookButton from "@/components/FacebookButton"
import GoogleButton from "@/components/GoogleButton"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Transaction } from "@/contracts/AbstractAccountContract/types/transaction"
import { useAbstractAccountContract } from "@/contracts/AbstractAccountContract/useAbstractAccountContract"
import { useEnv } from "@/hooks/useEnv"
import { NEAR_MAX_GAS } from "@/lib/constants"
import { parseOIDCToken } from "@/lib/utils"

type AuthModalProps = {
    isOpen: boolean
    onClose: () => void
    transaction: Transaction
    accountId: string
}

export default function AuthModal({ isOpen, onClose, transaction, accountId }: AuthModalProps) {
    const { contract } = useAbstractAccountContract()
    const { googleClientId, facebookAppId } = useEnv()

    const transactionCanonicalized = canonicalize(transaction)

    if (!contract) {
        return <div>Loading...</div>
    }

    const handleAuthenticate = async (config: Parameters<typeof AuthAdapter.sign>[1]) => {
        const result = await AuthAdapter.sign(transaction, config)
        await contract.auth({
            args: {
                user_op: {
                    transaction: transaction,
                    act_as: undefined, // TODO: Should be customizable in the future
                    auth: {
                        identity: result.authIdentity,
                        credentials: result.credentials,
                    },
                },
            },
            gas: NEAR_MAX_GAS,
            amount: "10" // TODO: Should be calculated dynamic base don the contract fee
        })
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Authentication Required</DialogTitle>
                    <DialogDescription>
                        Choose an authentication method to authorize this transaction
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Passkey Authentication</h3>
                        <div className="flex space-x-4">
                            <Button
                                onClick={() => {
                                    handleAuthenticate({
                                        type: "webauthn",
                                        config: {
                                            username: accountId
                                        }
                                    })
                                }}
                                variant="secondary"
                            >
                                Authenticate with Passkey
                            </Button>
                        </div>
                    </div>
                    <div className="flex flex-col gap-4">
                        <h3 className="text-lg font-semibold">Social Login</h3>
                        <div className="flex gap-2">
                            <GoogleButton
                                nonce={transactionCanonicalized}
                                onSuccess={(token) => {
                                    const { issuer, email } = parseOIDCToken(token)
                                    handleAuthenticate({
                                        type: "oidc",
                                        config: {
                                            clientId: googleClientId,
                                            issuer,
                                            email,
                                            sub: null,
                                            token
                                        }
                                    })
                                }}
                                onError={() => {
                                    console.error("Google authentication failed")
                                }}
                            />
                        </div>
                        <div className="flex gap-2">
                            <FacebookButton
                                nonce={transactionCanonicalized}
                                text="Authenticate with Facebook"
                                onSuccess={(token) => {
                                    const { issuer, email } = parseOIDCToken(token)
                                    handleAuthenticate({
                                        type: "oidc",
                                        config: {
                                            clientId: facebookAppId,
                                            issuer,
                                            email,
                                            sub: null,
                                            token
                                        }
                                    })
                                }}
                                onError={() => {
                                    console.error("Facebook authentication failed")
                                }}
                            />
                        </div>
                        <div className="flex gap-2">
                            <AuthButton
                                onClick={() => {
                                    handleAuthenticate({
                                        type: "wallet",
                                        config: {
                                            type: "solana",
                                            wallet: "phantom"
                                        }
                                    })
                                }}
                                imageSrc="/sol.svg"
                                imageAlt="Phantom logo"
                                buttonText="Authenticate with Phantom"
                            />
                        </div>
                        <div className="flex gap-2">
                            <AuthButton
                                onClick={() => {
                                    handleAuthenticate({
                                        type: "wallet",
                                        config: {
                                            type: "ethereum",
                                            wallet: "metamask"
                                        }
                                    })
                                }}
                                imageSrc="/metamask.svg"
                                imageAlt="Metamask logo"
                                buttonText="Authenticate with Metamask"
                            />
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
