"use client"

import { Copy, Key, Mail, Wallet } from "lucide-react"
import React from "react"

import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Identity, IdentityWithPermissions } from "@/contracts/AbstractAccountContract/types/transaction"
import { useToast } from "@/hooks/use-toast"

interface IdentitiesListProps {
    identities: IdentityWithPermissions[]
    onRemove: (identity: Identity) => void
}

export default function IdentitiesList({ identities, onRemove }: IdentitiesListProps) {
    const { toast } = useToast()

    const copyToClipboard = (text: string, description: string) => {
        navigator.clipboard.writeText(text)
        toast({
            title: "Copied!",
            description: `${description} copied to clipboard`,
        })
    }

    const getIdentityIcon = (identity: Identity) => {
        if ("WebAuthn" in identity) return <Key className="h-4 w-4" />
        if ("OIDC" in identity) return <Mail className="h-4 w-4" />
        if ("Wallet" in identity) return <Wallet className="h-4 w-4" />
        return null
    }

    const getIdentityName = (identity: Identity) => {
        if ("WebAuthn" in identity) return "Passkey"
        if ("OIDC" in identity) {
            const oidc = identity.OIDC
            return `${oidc.issuer} (${oidc.email || oidc.sub})`
        }
        if ("Wallet" in identity) {
            const wallet = identity.Wallet
            return `${wallet.wallet_type} (${wallet.public_key.slice(0, 8)}...)`
        }
        return "Unknown"
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Authentication Methods</CardTitle>
                <CardDescription>
                    Manage your authentication methods and their permissions
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {identities.map((identity, index) => (
                    <Collapsible key={index}>
                        <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
                            <div className="flex items-center space-x-4">
                                {getIdentityIcon(identity.identity)}
                                <div>
                                    <p className="text-sm font-medium leading-none">
                                        {getIdentityName(identity.identity)}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {identity.permissions?.enable_act_as
                                            ? "Can act as account"
                                            : "Basic authentication"}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                        Details
                                    </Button>
                                </CollapsibleTrigger>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(JSON.stringify(identity, null, 2), "Identity details")}
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => onRemove(identity.identity)}
                                >
                                    Remove
                                </Button>
                            </div>
                        </div>
                        <CollapsibleContent className="space-y-2">
                            <div className="rounded-md bg-muted px-4 py-3 font-mono text-sm mt-2">
                                <pre className="text-xs">{JSON.stringify(identity, null, 2)}</pre>
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                ))}

                {identities.length === 0 && (
                    <div className="flex h-[100px] items-center justify-center rounded-md border border-dashed">
                        <p className="text-sm text-muted-foreground">
                            No authentication methods added yet
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
} 