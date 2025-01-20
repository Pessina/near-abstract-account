import { AbstractAccountContractClass } from "@/contracts/AbstractAccountContract/AbstractAccountContract";
import { Transaction } from "@/contracts/AbstractAccountContract/types/transaction";
import { AbstractAccountContractBuilder } from "@/contracts/AbstractAccountContract/utils/auth";
import { NEAR_MAX_GAS } from "@/lib/constants";

export const handleOIDCRegister = async ({
  contract,
  clientId,
  issuer,
  email,
  accountId,
}: {
  contract: AbstractAccountContractClass;
  clientId: string;
  issuer: string;
  email: string;
  accountId: string;
}) => {
  await contract.addAccount({
    args: {
      account_id: accountId,
      auth_identity: AbstractAccountContractBuilder.authIdentity.oidc({
        client_id: clientId,
        issuer,
        email,
      }),
    },
  });
};

export const handleOIDCAuthenticate = async ({
  contract,
  token,
  clientId,
  issuer,
  email,
  accountId,
  transaction,
}: {
  contract: AbstractAccountContractClass;
  token: string;
  clientId: string;
  issuer: string;
  email: string;
  accountId: string;
  transaction: Transaction;
}) => {
  const account = await contract.getAccountById({ account_id: accountId });
  if (!account) {
    throw new Error("Failed to get account");
  }

  await contract.auth({
    args: {
      user_op: {
        account_id: accountId,
        selected_auth_identity: undefined,
        auth: {
          authenticator: AbstractAccountContractBuilder.authIdentity.oidc({
            client_id: clientId,
            issuer,
            email,
          }),
          credentials: {
            token: token,
          },
        },
        transaction,
      },
    },
    gas: NEAR_MAX_GAS,
    amount: "10", // Should be dynamic based on the current fee
  });
};
