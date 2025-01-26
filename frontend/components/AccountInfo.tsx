"use client"

import { Copy } from "lucide-react"
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
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Account } from "@/contracts/AbstractAccountContract/AbstractAccountContract"
import { useToast } from "@/hooks/use-toast"

interface AccountInfoProps {
    account: Account
    accountId: string
}

export default function AccountInfo({ account, accountId }: AccountInfoProps) {
    const { toast } = useToast()

    const copyToClipboard = (text: string, description: string) => {
        navigator.clipboard.writeText(text)
        toast({
            title: "Copied!",
            description: `${description} copied to clipboard`,
        })
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>Account Details</span>
                    <HoverCard>
                        <HoverCardTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => copyToClipboard(JSON.stringify(account, null, 2), "Account details")}
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80">
                            <div className="flex justify-between space-x-4">
                                <div className="space-y-1">
                                    <h4 className="text-sm font-semibold">Copy Account Details</h4>
                                    <p className="text-sm">
                                        Copy the full account information in JSON format
                                    </p>
                                </div>
                            </div>
                        </HoverCardContent>
                    </HoverCard>
                </CardTitle>
                <CardDescription>
                    View and copy your account details
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Account ID</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => copyToClipboard(accountId, "Account ID")}
                        >
                            <span className="font-mono">{accountId}</span>
                            <Copy className="ml-2 h-3 w-3" />
                        </Button>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Nonce</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => copyToClipboard(account.nonce.toString(), "Nonce")}
                        >
                            <span className="font-mono">{account.nonce}</span>
                            <Copy className="ml-2 h-3 w-3" />
                        </Button>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Number of Identities</span>
                        <span className="font-mono text-xs">{account.identities.length}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
} 