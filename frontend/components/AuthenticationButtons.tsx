"use client"

import { Key } from "lucide-react"
import Image from "next/image"
import React from "react"


import { Button } from "@/components/ui/button"
import { AuthConfig } from "@/lib/auth/AuthAdapter"
import metamask from "@/public/metamask.svg"
import phantom from "@/public/sol.svg"

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
                <Key className="w-6 h-6 text-indigo-600" />
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
                    <Image src={metamask} alt="MetaMask" width="24" height="24" />
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
                    <Image src={phantom} alt="Phantom" width="24" height="24" />
                    <span>Phantom</span>
                </Button>
            </div>
        </div>
    )
} 