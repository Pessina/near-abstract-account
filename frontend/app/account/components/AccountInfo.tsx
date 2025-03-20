"use client";

import { Account } from "chainsig-aa.js";
import React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AccountInfoProps {
  account: Account;
  accountId: string;
}

const AccountInfo: React.FC<AccountInfoProps> = ({ account, accountId }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <span>Account Details</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Account ID</span>
            <span className="font-mono text-xs">{accountId}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Nonce</span>
            <span className="font-mono text-xs">{account.nonce}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Number of Identities</span>
            <span className="font-mono text-xs">
              {account.identities.length}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AccountInfo;
