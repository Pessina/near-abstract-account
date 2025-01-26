import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Account } from "@/contracts/AbstractAccountContract/AbstractAccountContract";
import { Identity } from "@/contracts/AbstractAccountContract/types/transaction";
import { useAbstractAccountContract } from "@/contracts/AbstractAccountContract/useAbstractAccountContract";
import { useToast } from "@/hooks/use-toast";

interface AccountWithId extends Account {
  account_id: string;
}

function getIdentityPath(identity: Identity): string {
  if ("WebAuthn" in identity) {
    return `webauthn/${identity.WebAuthn.key_id}`;
  }
  if ("OIDC" in identity) {
    const oidc = identity.OIDC;
    if (oidc.sub) {
      return `oidc/${oidc.issuer}/${oidc.client_id}/${oidc.sub}`;
    }
    if (oidc.email) {
      return `oidc/${oidc.issuer}/${oidc.client_id}/${oidc.email}`;
    }
    throw new Error("OIDC auth identity must have either email or sub");
  }
  if ("Wallet" in identity) {
    const wallet = identity.Wallet;
    return `wallet/${wallet.wallet_type}/${wallet.public_key}`;
  }
  if ("Account" in identity) {
    return `account/${identity.Account}`;
  }
  throw new Error("Unknown identity type");
}

export function useAdminData() {
  const { contract } = useAbstractAccountContract();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query to fetch all accounts
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

  // Query to fetch all identities for each account
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

  // Mutation to update account permissions
  const updatePermissionsMutation = useMutation({
    mutationFn: async ({
      accountId,
      identityPath,
      permissions,
    }: {
      accountId: string;
      identityPath: string;
      permissions: string[];
    }) => {
      if (!contract) throw new Error("Contract not initialized");

      const account = await contract.getAccountById({ account_id: accountId });
      if (!account) throw new Error("Account not found");

      const identity = account.identities.find(
        (i) => getIdentityPath(i.identity) === identityPath
      );
      if (!identity) throw new Error("Identity not found");

      return await contract.auth({
        args: {
          user_op: {
            auth: {
              identity: identity.identity,
              credentials: {
                token: "", // This will be filled by the auth process
              },
            },
            transaction: {
              account_id: accountId,
              nonce: account.nonce,
              action: {
                AddIdentity: {
                  identity: identity.identity,
                  permissions: {
                    enable_act_as: permissions.includes("FULL_ACCESS"),
                  },
                },
              },
            },
          },
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Permissions updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "identities"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update permissions: ${error}`,
        variant: "destructive",
      });
    },
  });

  return {
    accounts: accountsQuery.data,
    identities: identitiesQuery.data,
    isLoading: accountsQuery.isLoading || identitiesQuery.isLoading,
    error: accountsQuery.error || identitiesQuery.error,
    updatePermissions: updatePermissionsMutation.mutate,
  };
}
