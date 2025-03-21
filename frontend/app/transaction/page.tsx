"use client";

import {
  Action,
  Identity,
  AbstractAccountContractBuilder,
} from "chainsig-aa.js";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { utils, chainAdapters, MPCSignature } from "signet.js";
import { match } from "ts-pattern";

import AuthModal from "@/components/AuthModal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAbstractAccountContract } from "@/contracts/useAbstractAccountContract";
import { useToast } from "@/hooks/use-toast";
import { useChains } from "@/hooks/useChains";
import { useEnv } from "@/hooks/useEnv";
import { useAccount } from "@/providers/AccountContext";

type FormValues = {
  contractId: string;
  to: string;
  value: string;
  actAs: boolean;
  actAsIdentity?: string;
  selectedIdentity?: string;
  chain: "evm" | "btc" | "osmo";
};

type AuthProps = {
  accountId: string;
  transaction: {
    account_id: string;
    nonce: number;
    action: Action;
  };
  actAs?: Identity;
};

export default function TransactionForm() {
  const [authProps, setAuthProps] = useState<AuthProps | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [availableIdentities, setAvailableIdentities] = useState<Identity[]>(
    []
  );
  const [addressAndPublicKey, setAddressAndPublicKey] = useState<{
    address: string;
    publicKey: string;
  } | null>(null);
  const [transaction, setTransaction] = useState<unknown | null>(null);
  const { contract } = useAbstractAccountContract();
  const { toast } = useToast();
  const { abstractAccountContract } = useEnv();
  const { accountId, authIdentities } = useAccount();
  const { chains } = useChains();

  const { register, handleSubmit, watch, setValue } = useForm<FormValues>({
    defaultValues: {
      contractId: "",
      to: "",
      value: "",
      actAs: false,
      chain: "evm",
      selectedIdentity: undefined,
    },
  });

  const actAs = watch("actAs");
  const selectedChain = watch("chain");
  const selectedIdentity = watch("selectedIdentity");
  const actAsIdentity = watch("actAsIdentity");

  useEffect(() => {
    async function deriveAddress() {
      if (!chains || !accountId || !selectedIdentity) return;

      const identity =
        actAs && actAsIdentity ? actAsIdentity : selectedIdentity;

      try {
        let addressAndPublicKey: {
          address: string;
          publicKey: string;
        };
        const path = `${AbstractAccountContractBuilder.path.getPath(
          JSON.parse(identity)
        )},`;
        switch (selectedChain) {
          case "evm": {
            addressAndPublicKey = await chains.evm.deriveAddressAndPublicKey(
              abstractAccountContract,
              path
            );
            break;
          }
          case "btc": {
            addressAndPublicKey = await chains.btc.deriveAddressAndPublicKey(
              abstractAccountContract,
              path
            );
            break;
          }
          case "osmo": {
            addressAndPublicKey =
              await chains.osmosis.deriveAddressAndPublicKey(
                abstractAccountContract,
                path
              );
            break;
          }
        }
        setAddressAndPublicKey(addressAndPublicKey);
      } catch (err) {
        console.error("Error deriving address:", err);
      }
    }
    deriveAddress();
  }, [
    abstractAccountContract,
    accountId,
    actAs,
    actAsIdentity,
    chains,
    selectedChain,
    selectedIdentity,
  ]);

  useEffect(() => {
    if (authIdentities) {
      setAvailableIdentities(authIdentities.map((i) => i.identity));
    }
  }, [authIdentities]);

  if (!contract || !accountId) {
    return <div>Loading...</div>;
  }

  const onSubmit = async (data: FormValues) => {
    if (!chains || !selectedIdentity || !addressAndPublicKey) {
      toast({
        title: "Error",
        description: "Please select an identity to use for signing",
        variant: "destructive",
      });
      return;
    }

    try {
      const txData = await match(data.chain)
        .with("evm", async () => {
          const txData = await chains.evm.prepareTransactionForSigning({
            from: addressAndPublicKey?.address as `0x${string}`,
            to: data.to as `0x${string}`,
            value: BigInt(data.value),
          });
          return txData;
        })
        .with("btc", async () => {
          const txData = await chains.btc.prepareTransactionForSigning({
            publicKey: addressAndPublicKey?.publicKey,
            from: addressAndPublicKey?.address,
            to: data.to,
            value: data.value,
          });
          return txData;
        })
        .with("osmo", async () => {
          const txData = await chains.osmosis.prepareTransactionForSigning({
            address: addressAndPublicKey?.address,
            publicKey: addressAndPublicKey?.publicKey,
            messages: [
              {
                typeUrl: "/cosmos.bank.v1beta1.MsgSend",
                value: {
                  fromAddress: addressAndPublicKey?.address,
                  toAddress: data.to,
                  amount: [{ denom: "uosmo", amount: data.value }],
                },
              },
            ],
            memo: "Transaction from NEAR",
          });
          return txData;
        })
        .exhaustive();

      setTransaction(txData.transaction);

      const account = await contract.getAccountById({ account_id: accountId });

      if (!account) throw new Error("Account not found");

      const userOpTransaction = AbstractAccountContractBuilder.transaction.sign(
        {
          accountId: accountId,
          nonce: account.nonce,
          payloads: {
            contract_id: data.contractId,
            payloads: [
              {
                path: "",
                key_version: 0,
                payload: txData.hashesToSign[0],
              },
            ],
          },
        }
      );

      let actAsIdentity: Identity | undefined;

      if (data.actAs && data.actAsIdentity) {
        actAsIdentity = availableIdentities.find(
          (i) => JSON.stringify(i) === data.actAsIdentity
        );
      }

      setAuthProps({
        accountId: accountId,
        transaction: {
          account_id: accountId,
          nonce: account.nonce,
          action: userOpTransaction.action,
        },
        ...(actAs ? { actAs: actAsIdentity } : {}),
      });

      setAuthModalOpen(true);
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to create transaction",
        variant: "destructive",
      });
    }
  };

  const finalizeTransactionSigning = async (result: MPCSignature) => {
    if (!chains) throw new Error("Chains not initialized");

    const rsv = utils.cryptography.toRSV(result);

    const txHash = await match(selectedChain)
      .with("evm", () => {
        const tx = chains.evm.finalizeTransactionSigning({
          transaction: transaction as chainAdapters.evm.EVMUnsignedTransaction,
          rsvSignatures: [rsv],
        });
        return chains.evm.broadcastTx(tx);
      })
      .with("btc", () => {
        const tx = chains.btc.finalizeTransactionSigning({
          transaction: transaction as chainAdapters.btc.BTCUnsignedTransaction,
          rsvSignatures: [rsv],
        });
        return chains.btc.broadcastTx(tx);
      })
      .with("osmo", () => {
        const tx = chains.osmosis.finalizeTransactionSigning({
          transaction:
            transaction as chainAdapters.cosmos.CosmosUnsignedTransaction,
          rsvSignatures: [rsv],
        });
        return chains.osmosis.broadcastTx(tx);
      })
      .otherwise(() => {
        throw new Error(`Unsupported chain: ${selectedChain}`);
      });

    console.log({ txHash });
  };

  return (
    <div className="flex justify-center items-center h-full">
      {authProps && (
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          {...authProps}
          onSuccess={(result) =>
            finalizeTransactionSigning(result as MPCSignature)
          }
        />
      )}
      <Card className="w-full md:max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Create Transaction
          </CardTitle>
          <CardDescription className="text-center">
            Build and submit transactions to the contract
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label>Account ID</Label>
              <div className="p-2 bg-gray-100 rounded">{accountId}</div>
            </div>
            {addressAndPublicKey && (
              <div>
                <Label>Derived {selectedChain.toUpperCase()} Address</Label>
                <div className="p-2 bg-gray-100 rounded">
                  {addressAndPublicKey.address}
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="chain">Chain</Label>
              <Select
                onValueChange={(value) =>
                  setValue("chain", value as "evm" | "btc" | "osmo")
                }
                defaultValue="evm"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select chain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="evm">Ethereum</SelectItem>
                  <SelectItem value="btc">Bitcoin</SelectItem>
                  <SelectItem value="osmo">Osmosis</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="identity">Signing Identity</Label>
              <Select
                onValueChange={(value) => setValue("selectedIdentity", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select identity for signing" />
                </SelectTrigger>
                <SelectContent>
                  {availableIdentities.map((identity, index) => (
                    <SelectItem key={index} value={JSON.stringify(identity)}>
                      {getIdentityDisplayName(identity)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="contractId">Contract ID</Label>
              <Input id="contractId" {...register("contractId")} />
            </div>
            <div>
              <Label htmlFor="to">To</Label>
              <Input id="to" {...register("to")} />
            </div>
            <div>
              <Label htmlFor="value">Value</Label>
              <Input id="value" {...register("value")} />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="actAs"
                checked={actAs}
                onChange={(e) => setValue("actAs", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="actAs">Act as another identity</Label>
            </div>
            {actAs && availableIdentities.length > 0 && (
              <div>
                <Label htmlFor="actAsIdentity">Select Identity</Label>
                <Select
                  onValueChange={(value) => setValue("actAsIdentity", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an identity" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableIdentities.map((identity, index) => (
                      <SelectItem key={index} value={JSON.stringify(identity)}>
                        {getIdentityDisplayName(identity)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {actAs && availableIdentities.length === 0 && (
              <div className="text-sm text-destructive">
                No authIdentities with act-as permission available
              </div>
            )}
            <Button type="submit" className="w-full">
              Submit Transaction
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function getIdentityDisplayName(identity: Identity): string {
  if ("WebAuthn" in identity) {
    return `Passkey (${identity.WebAuthn.key_id.slice(0, 8)}...)`;
  }
  if ("OIDC" in identity) {
    const oidc = identity.OIDC;
    return `${oidc.issuer} (${oidc.email || oidc.sub})`;
  }
  if ("Wallet" in identity) {
    const wallet = identity.Wallet;
    return `${wallet.wallet_type} (${wallet.public_key.slice(0, 8)}...)`;
  }
  return "Unknown Identity";
}
