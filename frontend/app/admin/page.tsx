"use client";

import { Account } from "chainsig-aa.js";
import React from "react";

import AccountDetails from "./components/AccountDetails";
import UpdateOIDCKeys from "./components/UpdateOIDCKeys";

import ContractBalanceManagement from "@/app/admin/components/ContractBalanceManagement";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAdminData } from "@/hooks/useAdminData";

interface AccountWithId extends Account {
  account_id: string;
}

export default function AdminPage() {
  const { accounts, identities, isLoading } = useAdminData();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">Loading...</div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Admin Dashboard</CardTitle>
          <CardDescription>
            Manage accounts, identities, and authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">OIDC Keys Management</h2>
            <UpdateOIDCKeys />
          </div>
          <Separator />
          <div>
            <h2 className="text-lg font-semibold mb-4">Contract Balance</h2>
            <ContractBalanceManagement />
          </div>
          <Separator />
          <div>
            <h2 className="text-lg font-semibold mb-4">Accounts Management</h2>
            <div className="space-y-4">
              {accounts?.map((account: AccountWithId) => (
                <AccountDetails
                  key={account.account_id}
                  account={account}
                  identities={identities?.get(account.account_id) || []}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
