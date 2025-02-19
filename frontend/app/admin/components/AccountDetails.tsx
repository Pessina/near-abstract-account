"use client";

import { AbstractAccountContractBuilder, Account, IdentityWithPermissions } from "chainsig-aa.js";
import { Key } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AccountDetailsProps {
    account: Account & {
        account_id: string;
    };
    identities: IdentityWithPermissions[];
}

const AccountDetails: React.FC<AccountDetailsProps> = ({ account, identities }) => {
    return (
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4">
                <div>
                    <CardTitle className="text-xl font-medium">
                        {account.account_id}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                        Nonce: {account.nonce}
                    </p>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    <div className="space-y-2">
                        {identities.map((identity, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-2 p-2 rounded-md bg-secondary/50"
                            >
                                <Key className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm break-all">
                                    {AbstractAccountContractBuilder.path.getPath(identity.identity)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default AccountDetails;