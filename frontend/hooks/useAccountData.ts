import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import React from "react";

import { useAccount } from "@/app/_providers/AccountContext";
import { UserOperation } from "@/contracts/AbstractAccountContract/types/transaction";
import { useAbstractAccountContract } from "@/contracts/AbstractAccountContract/useAbstractAccountContract";
import { useToast } from "@/hooks/use-toast";

export function useAccountData() {
  const { contract } = useAbstractAccountContract();
  const { accountId, setAccount, logout } = useAccount();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();
  const previousDataRef = React.useRef<typeof accountQuery.data>(null);

  const accountQuery = useQuery({
    queryKey: ["account", accountId],
    queryFn: async () => {
      if (!contract || !accountId) return null;
      return contract.getAccountById({ account_id: accountId });
    },
    enabled: !!contract && !!accountId,
    staleTime: 0,
  });

  React.useEffect(() => {
    if (accountQuery.data && accountQuery.data !== previousDataRef.current) {
      previousDataRef.current = accountQuery.data;
      setAccount(accountQuery.data);
    }
  }, [accountQuery.data, setAccount]);

  React.useEffect(() => {
    if (accountQuery.error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load account data",
      });
    }
  }, [accountQuery.error, toast]);

  const identitiesQuery = useQuery({
    queryKey: ["identities", accountId],
    queryFn: async () => {
      if (!contract || !accountId) return [];
      const result = await contract.listAuthIdentities({
        account_id: accountId,
      });
      return result || [];
    },
    enabled: !!contract && !!accountId,
    staleTime: 0,
  });

  React.useEffect(() => {
    if (identitiesQuery.error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load authentication methods",
      });
    }
  }, [identitiesQuery.error, toast]);

  const addIdentityMutation = useMutation({
    mutationFn: async ({
      transaction,
      onSuccess,
    }: {
      transaction: UserOperation;
      onSuccess?: () => void;
    }) => {
      if (!contract || !accountId) {
        throw new Error("Contract or account ID not found");
      }
      const result = await contract.auth({ args: { user_op: transaction } });
      onSuccess?.();
      return result;
    },
    onSuccess: async () => {
      toast({
        title: "Success",
        description: "Authentication method added successfully",
      });
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["account", accountId] }),
        queryClient.refetchQueries({ queryKey: ["identities", accountId] }),
      ]);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add authentication method",
      });
    },
  });

  const removeIdentityMutation = useMutation({
    mutationFn: async ({
      transaction,
      onSuccess,
    }: {
      transaction: UserOperation;
      onSuccess?: () => void;
    }) => {
      if (!contract || !accountId) {
        throw new Error("Contract or account ID not found");
      }
      const result = await contract.auth({ args: { user_op: transaction } });
      onSuccess?.();
      return result;
    },
    onSuccess: async () => {
      toast({
        title: "Success",
        description: "Authentication method removed successfully",
      });
      const [, identities] = await Promise.all([
        queryClient.refetchQueries({ queryKey: ["account", accountId] }),
        queryClient.fetchQuery({
          queryKey: ["identities", accountId],
          queryFn: async () => {
            if (!contract || !accountId) return [];
            const result = await contract.listAuthIdentities({
              account_id: accountId,
            });
            return result || [];
          },
        }),
      ]);
      if (identities.length === 0) {
        await logout();
        router.push("/");
      }
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove authentication method",
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async ({
      transaction,
      onSuccess,
    }: {
      transaction: UserOperation;
      onSuccess?: () => void;
    }) => {
      if (!contract || !accountId) {
        throw new Error("Contract or account ID not found");
      }
      const result = await contract.auth({ args: { user_op: transaction } });
      onSuccess?.();
      return result;
    },
    onSuccess: async () => {
      toast({
        title: "Success",
        description: "Account deleted successfully",
      });
      await logout();
      router.push("/");
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete account",
      });
    },
  });

  return {
    account: accountQuery.data,
    identities: identitiesQuery.data,
    isLoading:
      (accountQuery.isLoading || identitiesQuery.isLoading) && !!accountId,
    addIdentityMutation,
    removeIdentityMutation,
    deleteAccountMutation,
  };
}
