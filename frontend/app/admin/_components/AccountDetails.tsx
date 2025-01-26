"use client";

import { ChevronDown, ChevronUp, Copy, Key, Shield } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Account } from "@/contracts/AbstractAccountContract/AbstractAccountContract";
import { Identity, IdentityWithPermissions } from "@/contracts/AbstractAccountContract/types/transaction";
import { useToast } from "@/hooks/use-toast";

function getIdentityPath(identity: Identity): string {
    if ("WebAuthn" in identity) {
        return `webauthn/${identity.WebAuthn.key_id}`;
    }
    if ("OIDC" in identity) {
        const oidc = identity.OIDC;
        if (oidc.sub) {
            return `oidc/${oidc.issuer}/${oidc.client_id}/${oidc.sub}`;
        }
        if (oidc.email) {
            return `oidc/${oidc.issuer}/${oidc.client_id}/${oidc.email}`;
        }
        throw new Error("OIDC auth identity must have either email or sub");
    }
    if ("Wallet" in identity) {
        const wallet = identity.Wallet;
        return `wallet/${wallet.wallet_type}/${wallet.public_key}`;
    }
    if ("Account" in identity) {
        return `account/${identity.Account}`;
    }
    throw new Error("Unknown identity type");
}

interface AccountDetailsProps {
    account: Account & {
        account_id: string;
    };
    identities: IdentityWithPermissions[];
    onUpdatePermissions: (accountId: string, identityPath: string, permissions: string[]) => void;
}

export default function AccountDetails({ account, identities, onUpdatePermissions }: AccountDetailsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const { toast } = useToast();

    const copyToClipboard = (text: string, description: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: "Copied!",
            description,
        });
    };

    return (
        <Card className="w-full">
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-2xl font-bold">
                        Account: {account.account_id}
                    </CardTitle>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">
                            {isOpen ? (
                                <ChevronUp className="h-4 w-4" />
                            ) : (
                                <ChevronDown className="h-4 w-4" />
                            )}
                        </Button>
                    </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Nonce:</span>
                            <div className="flex items-center gap-2">
                                <span>{account.nonce}</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => copyToClipboard(account.nonce.toString(), "Nonce copied to clipboard")}
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h3 className="font-semibold">Identities ({identities.length})</h3>
                            {identities.map((identity: IdentityWithPermissions, index: number) => {
                                const path = getIdentityPath(identity.identity);
                                return (
                                    <Card key={index} className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Key className="h-4 w-4" />
                                                <span className="text-sm">{path}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => copyToClipboard(path, "Identity path copied to clipboard")}
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        onUpdatePermissions(account.account_id, path, ["FULL_ACCESS"]);
                                                    }}
                                                >
                                                    <Shield className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
} 