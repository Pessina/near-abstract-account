import { WebAuthn } from "@/lib/auth/WebAuthn/WebAuthn";
import canonicalize from "canonicalize";
import { AbstractAccountContractClass } from "@/contracts/AbstractAccountContract/AbstractAccountContract";
import { AbstractAccountContractBuilder } from "@/contracts/AbstractAccountContract/utils/auth";
import { Transaction } from "@/contracts/AbstractAccountContract/types/transaction";
import { NEAR_MAX_GAS } from "@/lib/constants";

export const handlePasskeyRegister = async ({
  username,
  accountId,
  contract,
}: {
  username: string;
  accountId: string;
  contract: AbstractAccountContractClass;
}) => {
  const webAuthn = new WebAuthn();
  const authIdentity = await webAuthn.getAuthIdentity({
    id: username,
  });

  if (!authIdentity || !contract) {
    throw new Error("Failed to create credential or initialize contract");
  }

  await contract.addAccount({
    args: {
      account_id: accountId,
      auth_identity: authIdentity,
    },
  });
};

export const handlePasskeyAuthenticate = async ({
  accountId,
  contract,
  transaction,
}: {
  accountId: string;
  contract: AbstractAccountContractClass;
  transaction: Transaction;
}) => {
  const account = await contract.getAccountById({ account_id: accountId });
  if (!account) {
    throw new Error("Failed to get account");
  }

  const canonical = canonicalize(transaction);
  if (!canonical) {
    throw new Error("Failed to canonicalize transaction");
  }

  const webAuthn = new WebAuthn();
  const signature = await webAuthn.sign(canonical);
  if (!signature) {
    throw new Error("Failed to sign message");
  }

  await contract.auth({
    args: {
      user_op: {
        account_id: accountId,
        selected_auth_identity: undefined,
        auth: {
          authenticator: AbstractAccountContractBuilder.authIdentity.webauthn({
            key_id: signature.rawId,
          }),
          credentials: {
            signature: signature.signature,
            authenticator_data: signature.authenticatorData,
            client_data: JSON.stringify(signature.clientData),
          },
        },
        transaction,
      },
    },
    gas: NEAR_MAX_GAS,
    amount: "10", // Should be dynamic based on the current fee
  });
};
