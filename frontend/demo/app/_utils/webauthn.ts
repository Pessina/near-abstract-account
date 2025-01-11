import { WebAuthn } from "@/lib/auth/WebAuthn/WebAuthn";
import canonicalize from "canonicalize";
import { AbstractAccountContract } from "@/lib/contract/AbstractAccountContract";
import { mockTransaction } from "@/lib/constants";

export const handlePasskeyRegister = async ({
  username,
  accountId,
  contract,
  setStatus,
  setIsPending,
}: {
  username: string;
  accountId: string;
  contract: AbstractAccountContract;
  setStatus: (status: string) => void;
  setIsPending: (isPending: boolean) => void;
}) => {
  setIsPending(true);
  try {
    const webAuthn = new WebAuthn();
    const authIdentity = await webAuthn.getAuthIdentity({ id: username });
    if (!authIdentity || !contract) {
      setStatus("Failed to create credential or initialize contract");
      return;
    }

    await contract.addAccount(accountId, authIdentity);
    setStatus("Passkey registration successful!");
  } catch (error) {
    console.error(error);
    setStatus(`Error during registration: ${(error as Error).message}`);
  } finally {
    setIsPending(false);
  }
};

export const handlePasskeyAuthenticate = async ({
  accountId,
  contract,
  setStatus,
  setIsPending,
}: {
  accountId: string;
  contract: AbstractAccountContract;
  setStatus: (status: string) => void;
  setIsPending: (isPending: boolean) => void;
}) => {
  setIsPending(true);
  try {
    const account = await contract.getAccountById(accountId);
    if (!account || !contract) {
      setStatus("Failed to get account or initialize contract");
      return;
    }

    const transaction = mockTransaction();

    const canonical = canonicalize(transaction);
    if (!canonical) {
      setStatus("Failed to canonicalize transaction");
      return;
    }

    const webAuthn = new WebAuthn();
    const signature = await webAuthn.sign(canonical);
    if (!signature) {
      setStatus("Failed to sign message");
      return;
    }

    await contract.sendTransaction({
      account_id: accountId,
      selected_auth_identity: undefined,
      auth: {
        auth_identity: {
          key_id: signature.rawId,
        },
        auth_data: {
          signature: signature.signature,
          authenticator_data: signature.authenticatorData,
          client_data: JSON.stringify(signature.clientData),
        },
      },
      payloads: transaction,
    });

    setStatus("Passkey authentication successful!");
  } catch (error) {
    console.error(error);
    setStatus(`Error during authentication: ${(error as Error).message}`);
  } finally {
    setIsPending(false);
  }
};
