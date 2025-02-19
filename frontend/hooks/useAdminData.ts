import { useQuery } from "@tanstack/react-query";
import { Account } from "chainsig-aa.js";

import { useAbstractAccountContract } from "@/contracts/useAbstractAccountContract";

interface AccountWithId extends Account {
  account_id: string;
}

export function useAdminData() {
  const { contract } = useAbstractAccountContract();

  const accountsQuery = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      if (!contract) throw new Error("Contract not initialized");
      const accountIds = await contract.listAccountIds();
      const accounts: AccountWithId[] = [];

      for (const accountId of accountIds) {
        const account = await contract.getAccountById({
          account_id: accountId,
        });
        if (account) {
          accounts.push({ ...account, account_id: accountId });
        }
      }

      return accounts;
    },
    enabled: !!contract,
  });

  const identitiesQuery = useQuery({
    queryKey: ["admin", "identities"],
    queryFn: async () => {
      if (!contract || !accountsQuery.data)
        throw new Error("Contract not initialized or no accounts");

      const identitiesMap = new Map();
      for (const account of accountsQuery.data) {
        const identities = await contract.listAuthIdentities({
          account_id: account.account_id,
        });
        identitiesMap.set(account.account_id, identities);
      }
      return identitiesMap;
    },
    enabled: !!contract && !!accountsQuery.data,
  });

  return {
    accounts: accountsQuery.data,
    identities: identitiesQuery.data,
    isLoading: accountsQuery.isLoading || identitiesQuery.isLoading,
    error: accountsQuery.error || identitiesQuery.error,
  };
}
