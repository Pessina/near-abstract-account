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
    if (!WebAuthn.isSupportedByBrowser()) {
      setStatus("WebAuthn is not supported by this browser");
      return;
    }

    const credential = await WebAuthn.create({ username });
    if (!credential || !contract) {
      setStatus("Failed to create credential or initialize contract");
      return;
    }

    console.log("credential", credential);

    await contract.addAccount(accountId, {
      WebAuthn: {
        key_id: credential.rawId,
        compressed_public_key: credential.compressedPublicKey,
      },
    });
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

    const challenge = new TextEncoder().encode(canonical);
    const challengeHash = await crypto.subtle.digest("SHA-256", challenge);

    const credential = await WebAuthn.get(new Uint8Array(challengeHash));
    if (!credential) {
      setStatus("Failed to get credential");
      return;
    }

    console.log("credential", credential);

    await contract.sendTransaction({
      account_id: accountId,
      selected_auth_identity: undefined,
      auth: {
        auth_identity: {
          WebAuthn: {
            key_id: credential.rawId,
          },
        },
        auth_data: {
          signature: credential.signature,
          authenticator_data: credential.authenticatorData,
          client_data: JSON.stringify(credential.clientData),
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
