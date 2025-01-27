import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { useAccount } from "@/app/_providers/AccountContext";
import { useAbstractAccountContract } from "@/contracts/AbstractAccountContract/useAbstractAccountContract";
import { useToast } from "@/hooks/use-toast";

export function useAccountData() {
  const { contract } = useAbstractAccountContract();
  const { accountId, logout } = useAccount();
  const { toast } = useToast();
  const previousDataRef = useRef<typeof accountQuery.data>(null);

  const accountQuery = useQuery({
    queryKey: ["account", accountId],
    queryFn: async () => {
      if (!contract || !accountId) return null;
      return contract.getAccountById({ account_id: accountId });
    },
    enabled: !!contract && !!accountId,
    staleTime: 0,
  });

  useEffect(() => {
    if (!accountQuery.isLoading && accountQuery.data === null) {
      logout();
    }
  }, [accountQuery.data, accountQuery.isLoading, logout]);

  useEffect(() => {
    if (accountQuery.data && accountQuery.data !== previousDataRef.current) {
      previousDataRef.current = accountQuery.data;
    }
  }, [accountQuery.data]);

  useEffect(() => {
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

  useEffect(() => {
    if (identitiesQuery.error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load authentication methods",
      });
    }
  }, [identitiesQuery.error, toast]);

  return {
    account: accountQuery.data,
    identities: identitiesQuery.data,
    isLoading:
      (accountQuery.isLoading || identitiesQuery.isLoading) && !!accountId,
  };
}
