import { AbstractAccountContract } from "@/contracts/AbstractAccountContract/AbstractAccountContract";
import { mockTransaction } from "@/lib/constants";

export const handleOIDCRegister = async ({
  contract,
  setStatus,
  setIsPending,
  clientId,
  issuer,
  email,
  accountId,
}: {
  contract: AbstractAccountContract;
  setStatus: (status: string) => void;
  setIsPending: (isPending: boolean) => void;
  token: string;
  clientId: string;
  issuer: string;
  email: string;
  accountId: string;
}) => {
  setIsPending(true);
  try {
    await contract.addAccount(accountId, {
      OIDC: {
        client_id: clientId,
        issuer: issuer,
        email: email,
      },
    });
    setStatus(`OIDC registration successful!`);
  } catch (error) {
    console.error(error);
    setStatus(`Error during registration: ${(error as Error).message}`);
  } finally {
    setIsPending(false);
  }
};

export const handleOIDCAuthenticate = async ({
  contract,
  setStatus,
  setIsPending,
  token,
  clientId,
  issuer,
  email,
  accountId,
}: {
  contract: AbstractAccountContract;
  setStatus: (status: string) => void;
  setIsPending: (isPending: boolean) => void;
  token: string;
  clientId: string;
  issuer: string;
  email: string;
  accountId: string;
}) => {
  setIsPending(true);
  try {
    const account = await contract.getAccountById(accountId);
    if (!account) {
      setStatus("Failed to get account");
      return;
    }

    await contract.auth({
      account_id: accountId,
      selected_auth_identity: undefined,
      auth: {
        authenticator: {
          OIDC: {
            client_id: clientId,
            issuer: issuer,
            email: email,
          },
        },
        credentials: {
          token: token,
        },
      },
      transaction: {
        Sign: mockTransaction(),
      },
    });

    setStatus(`OIDC authentication successful!`);
  } catch (error) {
    console.error(error);
    setStatus(`Error during authentication: ${(error as Error).message}`);
  } finally {
    setIsPending(false);
  }
};
