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

export enum AuthMethod {
    Passkey = "passkey",
    MetaMask = "metamask",
    Phantom = "phantom",
    Google = "google",
    Facebook = "facebook",
}

interface AuthenticationButtonsProps {
    onAuth: (config: AuthConfig) => void
    accountId?: string
    mode?: "login" | "register"
    nonce?: string
    authMethods?: AuthMethod[]
}

const AuthenticationButtons: React.FC<AuthenticationButtonsProps> = ({
    onAuth,
    accountId,
    mode = "login",
    nonce,
    authMethods = [], // Default to empty array
}) => {
    const { facebookAppId, googleClientId } = useEnv()

    // If authMethods is empty, show all available methods
    const showAll = authMethods.length === 0

    const showPasskey = (showAll || authMethods.includes(AuthMethod.Passkey)) && accountId
    const showMetaMask = showAll || authMethods.includes(AuthMethod.MetaMask)
    const showPhantom = showAll || authMethods.includes(AuthMethod.Phantom)
    const showGoogle = showAll || authMethods.includes(AuthMethod.Google)
    const showFacebook = showAll || authMethods.includes(AuthMethod.Facebook)

    const hasPrecedingButtons = showPasskey || showMetaMask || showPhantom
    const hasOidcButtons = showGoogle || showFacebook
    const showSeparator = hasPrecedingButtons && hasOidcButtons

    return (
        <div className="space-y-4">
            {showPasskey && (
                <Button
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
            )}

            {(showMetaMask || showPhantom) && (
                <div className="grid grid-cols-2 gap-4">
                    {showMetaMask && (
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
                    )}
                    {showPhantom && (
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
                    )}
                </div>
            )}

            {showSeparator && (
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
            )}

            {(showGoogle || showFacebook) && (
                <div className="grid grid-cols-2 gap-4">
                    {showGoogle && (
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
                                    },
                                })
                            }}
                            onError={() => {
                                console.error("Google authentication failed")
                            }}
                            nonce={nonce}
                        />
                    )}
                    {showFacebook && (
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
                                    },
                                })
                            }}
                            onError={(error) => {
                                console.error("Facebook authentication failed:", error)
                            }}
                            nonce={nonce}
                        />
                    )}
                </div>
            )}
        </div>
    )
}

export default AuthenticationButtons