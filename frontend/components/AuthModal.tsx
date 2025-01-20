"use client"

import React from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import GoogleButton from "@/components/GoogleButton"
import FacebookButton from "@/components/FacebookButton"
import AuthButton from "@/components/AuthButton"
import { handlePasskeyAuthenticate } from "@/app/_utils/webauthn"
import { handleOIDCAuthenticate } from "@/app/_utils/oidc"
import { handleWalletAuthenticate } from "@/app/_utils/wallet"
import canonicalize from "canonicalize"
import { Transaction } from "@/contracts/AbstractAccountContract/types/transaction"
import { useAbstractAccountContract } from "@/contracts/AbstractAccountContract/useAbstractAccountContract"
import { useEnv } from "@/hooks/useEnv"
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
                                    handlePasskeyAuthenticate({
                                        contract,
                                        accountId,
                                        transaction,
                                    });
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
                                    handleOIDCAuthenticate({
                                        contract,
                                        accountId,
                                        token,
                                        clientId: googleClientId,
                                        issuer,
                                        email,
                                        transaction,
                                        sub: null,
                                    });
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
                                    handleOIDCAuthenticate({
                                        contract,
                                        accountId,
                                        token,
                                        clientId: facebookAppId,
                                        issuer,
                                        email,
                                        transaction,
                                        sub: null,
                                    });
                                }}
                                onError={() => {
                                    console.error("Facebook authentication failed")
                                }}
                            />
                        </div>
                        <div className="flex gap-2">
                            <AuthButton
                                onClick={() => {
                                    handleWalletAuthenticate({
                                        contract,
                                        walletConfig: {
                                            type: "solana",
                                            wallet: "phantom",
                                        },
                                        accountId,
                                        transaction,
                                    });
                                }}
                                imageSrc="/sol.svg"
                                imageAlt="Phantom logo"
                                buttonText="Authenticate with Phantom"
                            />
                        </div>
                        <div className="flex gap-2">
                            <AuthButton
                                onClick={() => {
                                    handleWalletAuthenticate({
                                        contract,
                                        walletConfig: {
                                            type: "ethereum",
                                            wallet: "metamask",
                                        },
                                        accountId,
                                        transaction,
                                    });
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

