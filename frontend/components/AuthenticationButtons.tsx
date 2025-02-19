"use client"

import { Key } from "lucide-react"
import Image from "next/image"
import React from "react"

import FacebookButton from "./FacebookButton"
import GoogleButton from "./GoogleButton"

import { Button } from "@/components/ui/button"
import { useEnv } from "@/hooks/useEnv"
import { AuthConfig } from "@/lib/auth/AuthAdapter"
import { parseOIDCToken } from "@/lib/utils"
import metamask from "@/public/metamask.svg"
import phantom from "@/public/sol.svg"

interface AuthenticationButtonsProps {
    onAuth: (config: AuthConfig) => void
    accountId?: string
    mode?: "login" | "register"
    nonce?: string
}

const AuthenticationButtons: React.FC<AuthenticationButtonsProps> = ({
    onAuth,
    accountId,
    mode = "login",
    nonce
}) => {
    const { facebookAppId, googleClientId } = useEnv()

    return (
        <div className="space-y-4">
            {accountId && <Button
                onClick={() => {
                    onAuth({
                        type: "webauthn",
                        config: {
                            username: accountId,
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
            }

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
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-gray-50 px-2 text-muted-foreground">
                        Or continue with
                    </span>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <GoogleButton
                    onSuccess={(idToken) => {
                        const { issuer, email } = parseOIDCToken(idToken)
                        onAuth({
                            type: "oidc",
                            config: {
                                issuer,
                                email,
                                sub: null,
                                clientId: googleClientId,
                                token: idToken,
                            }
                        })
                    }}
                    onError={() => {
                        console.error("Google authentication failed")
                    }}
                    nonce={nonce}
                />

                <FacebookButton
                    text={`${mode === "login" ? "Continue" : "Register"} with Facebook`}
                    onSuccess={(idToken) => {
                        const { issuer, email } = parseOIDCToken(idToken)
                        onAuth({
                            type: "oidc",
                            config: {
                                issuer,
                                email,
                                sub: null,
                                clientId: facebookAppId,
                                token: idToken,
                            }
                        })
                    }}
                    onError={(error) => {
                        console.error("Facebook authentication failed:", error)
                    }}
                    nonce={nonce}
                />
            </div>
        </div>
    )
}

export default AuthenticationButtons