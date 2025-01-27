"use client"

import React from "react"

import { AuthConfig } from "@/app/_utils/AuthAdapter"
import { MetaMaskIcon, PasskeyIcon, PhantomIcon } from "@/components/AuthIcons"
import { Button } from "@/components/ui/button"

interface AuthenticationButtonsProps {
    onAuth: (config: AuthConfig) => void
    accountId?: string
    mode?: "login" | "register"
}

export default function AuthenticationButtons({ onAuth, accountId, mode = "login" }: AuthenticationButtonsProps) {
    return (
        <div className="space-y-4">
            <Button
                onClick={() => {
                    onAuth({
                        type: "webauthn",
                        config: {
                            username: accountId || "user",
                            operation: mode === "login" ? "get" : "create",
                        },
                    })
                }}
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
            >
                <PasskeyIcon />
                <span>{mode === "login" ? "Continue" : "Register"} with Passkey</span>
            </Button>

            <div className="grid grid-cols-2 gap-4">
                <Button
                    onClick={() => {
                        onAuth({
                            type: "wallet",
                            config: {
                                wallet: "metamask",
                                type: "ethereum",
                            },
                        })
                    }}
                    variant="outline"
                    className="flex items-center justify-center gap-2"
                >
                    <MetaMaskIcon />
                    <span>MetaMask</span>
                </Button>
                <Button
                    onClick={() => {
                        onAuth({
                            type: "wallet",
                            config: {
                                wallet: "phantom",
                                type: "solana",
                            },
                        })
                    }}
                    variant="outline"
                    className="flex items-center justify-center gap-2"
                >
                    <PhantomIcon />
                    <span>Phantom</span>
                </Button>
            </div>
        </div>
    )
} 