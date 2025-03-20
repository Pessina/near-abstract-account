"use client";

import { useQueryClient } from "@tanstack/react-query";
import canonicalize from "canonicalize";
import { UserOperation, Transaction, Identity } from "chainsig-aa.js";

import AuthenticationButtons from "./AuthenticationButtons";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useAbstractAccountContract } from "@/contracts/useAbstractAccountContract";
import { useToast } from "@/hooks/use-toast";
import { AuthConfig, AuthAdapter } from "@/lib/auth/AuthAdapter";
import { NEAR_MAX_GAS } from "@/lib/constants";
import { useAccount } from "@/providers/AccountContext";

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result?: unknown) => void;
  accountId: string;
  transaction: Transaction;
  actAs?: Identity;
}

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  transaction,
  actAs,
}: AuthModalProps) {
  const { toast } = useToast();
  const { contract } = useAbstractAccountContract();
  const queryClient = useQueryClient();
  const { accountId } = useAccount();

  const canonicalizedTransaction = canonicalize(transaction);

  const handleAuth = async (config: AuthConfig) => {
    try {
      if (!contract || !canonicalizedTransaction) {
        throw new Error(
          "Contract not initialized or canonicalized transaction is undefined"
        );
      }

      const { credentials, authIdentity } = await AuthAdapter.sign(
        canonicalizedTransaction,
        config
      );

      console.log({ actAs });

      const userOp: UserOperation = {
        transaction,
        auth: {
          identity: authIdentity,
          credentials,
        },
        ...(actAs ? { act_as: actAs } : {}),
      };

      const ret = await contract.auth({
        args: {
          user_op: userOp,
        },
        gas: NEAR_MAX_GAS,
        amount: "10", // TODO: Should be dynamic according to the contract current fee
        waitUntil: "EXECUTED_OPTIMISTIC",
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["account", accountId] }),
        queryClient.invalidateQueries({ queryKey: ["identities", accountId] }),
      ]);

      toast({
        title: "Success",
        description: "Transaction executed successfully",
      });

      onSuccess?.(ret);
      onClose();
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  if (!accountId) {
    throw new Error("Auth modal can only be used when logged in");
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Authentication Required</DialogTitle>
          <DialogDescription>
            Please authenticate to proceed with the transaction
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <AuthenticationButtons
            onAuth={handleAuth}
            nonce={canonicalizedTransaction}
            accountId={accountId}
          />
          <Separator className="my-4" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
