import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { useAccount } from "@/app/_providers/AccountContext";
import { useAbstractAccountContract } from "@/contracts/useAbstractAccountContract";

export function useAccountData() {
  const { contract } = useAbstractAccountContract();
  const { accountId, logout } = useAccount();

  const accountQuery = useQuery({
    queryKey: ["account", accountId],
    queryFn: async () => {
      if (!contract || !accountId) return null;
      return contract.getAccountById({ account_id: accountId });
    },
    enabled: !!contract && !!accountId,
    staleTime: 0,
  });

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
    if (!accountQuery.isLoading && accountQuery.data === null) {
      logout();
    }
  }, [accountQuery.data, accountQuery.isLoading, logout]);

  return {
    account: accountQuery.data,
    identities: identitiesQuery.data,
    isLoading:
      (accountQuery.isLoading || identitiesQuery.isLoading) && !!accountId,
  };
}
