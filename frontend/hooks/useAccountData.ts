import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { useAbstractAccountContract } from "@/contracts/useAbstractAccountContract";
import { useAccount } from "@/providers/AccountContext";

export function useAccountData() {
  const { contract } = useAbstractAccountContract();
  const {
    accountId,
    logout,
    authIdentities,
    isLoading: isContextLoading,
  } = useAccount();

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

  return {
    account: accountQuery.data,
    authIdentities,
    isLoading: (accountQuery.isLoading || isContextLoading) && !!accountId,
  };
}
