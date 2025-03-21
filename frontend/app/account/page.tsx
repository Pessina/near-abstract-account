"use client";

import {
  Transaction,
  Identity,
  AbstractAccountContractBuilder,
} from "chainsig-aa.js";
import React, { useState } from "react";

import { AuthAdapter, AuthConfig } from "../../lib/auth/AuthAdapter";

import AccountInfo from "@/app/account/components/AccountInfo";
import IdentitiesList from "@/app/account/components/IdentitiesList";
import AuthenticationButtons from "@/components/AuthenticationButtons";
import AuthModal from "@/components/AuthModal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAccountData } from "@/hooks/useAccountData";
import { useAccount } from "@/providers/AccountContext";

export default function AccountPage() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authProps, setAuthProps] = useState<{
    accountId: string;
    transaction: Transaction;
  } | null>(null);
  const { accountId, authIdentities } = useAccount();
  const [enableActAs, setEnableActAs] = useState(false);
  const { account, isLoading } = useAccountData();

  if (isLoading || !account || !accountId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">Loading account...</div>
      </div>
    );
  }

  const addIdentityWithAuthNonce =
    AbstractAccountContractBuilder.nonce.addIdentityWithAuth({
      account_id: accountId,
      nonce: account?.nonce.toString(),
      permissions: {
        enable_act_as: enableActAs,
      },
    });

  const handleAddIdentity = async (config: AuthConfig) => {
    if (!addIdentityWithAuthNonce) {
      throw new Error("Canonicalized nonce is undefined");
    }

    const { credentials, authIdentity } = await AuthAdapter.sign(
      addIdentityWithAuthNonce,
      config
    );

    let transaction: Transaction;

    if (!enableActAs) {
      transaction = AbstractAccountContractBuilder.transaction.addIdentity({
        accountId,
        nonce: account.nonce ?? 0,
        identity_with_permissions: {
          identity: authIdentity,
          permissions: {
            enable_act_as: enableActAs,
          },
        },
      });
    } else {
      transaction =
        AbstractAccountContractBuilder.transaction.addIdentityWithAuth({
          accountId,
          nonce: account.nonce ?? 0,
          auth: {
            identity_with_permissions: {
              identity: authIdentity,
              permissions: {
                enable_act_as: enableActAs,
              },
            },
            credentials,
          },
        });
    }

    setAuthProps({
      accountId,
      transaction,
    });
    setAuthModalOpen(true);
  };

  const handleRemoveIdentity = async (identity: Identity) => {
    const transaction =
      AbstractAccountContractBuilder.transaction.removeIdentity({
        accountId,
        nonce: account.nonce ?? 0,
        identity,
      });

    setAuthProps({
      accountId,
      transaction,
    });
    setAuthModalOpen(true);
  };

  const handleDeleteAccount = async () => {
    const transaction =
      AbstractAccountContractBuilder.transaction.removeAccount({
        accountId,
        nonce: account.nonce ?? 0,
      });

    setAuthProps({
      accountId,
      transaction,
    });
    setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {authProps && (
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => {
            setAuthModalOpen(false);
            setAuthProps(null);
          }}
          {...authProps}
        />
      )}
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Account Management</h1>
          </div>
          {account && <AccountInfo account={account} accountId={accountId} />}
          <IdentitiesList
            identities={authIdentities || []}
            onRemove={handleRemoveIdentity}
          />
          <Card>
            <CardHeader>
              <CardTitle>Add Authentication Method</CardTitle>
              <CardDescription>
                Add a new way to authenticate to your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-2 mb-4">
                <Switch
                  id="enable-act-as"
                  checked={enableActAs}
                  onCheckedChange={setEnableActAs}
                />
                <Label htmlFor="enable-act-as">
                  Enable Act As permission for this identity
                </Label>
              </div>
              <AuthenticationButtons
                onAuth={handleAddIdentity}
                nonce={addIdentityWithAuthNonce}
                accountId={accountId}
                mode="register"
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
              <CardDescription>
                These actions are irreversible. Please be certain.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={handleDeleteAccount}>
                Delete Account
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
