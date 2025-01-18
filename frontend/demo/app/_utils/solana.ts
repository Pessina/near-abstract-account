import { AbstractAccountContract } from "@/contracts/AbstractAccountContract/AbstractAccountContract";
import canonicalize from "canonicalize";
import { Solana, SolanaWalletType } from "@/lib/auth/Solana/Solana";
import { mockTransaction } from "@/lib/constants";
import { WalletType as AuthIdentityWalletType } from "@/contracts/AbstractAccountContract/types/auth";

export const handleSolanaRegister = async ({
  contract,
  setStatus,
  setIsPending,
  wallet,
  accountId,
}: {
  contract: AbstractAccountContract;
  setStatus: (status: string) => void;
  setIsPending: (isPending: boolean) => void;
  wallet: SolanaWalletType;
  accountId: string;
}) => {
  setIsPending(true);
  try {
    const solana = new Solana();
    Solana.setWallet(wallet);

    const authIdentity = await solana.getAuthIdentity();
    if (!authIdentity) {
      setStatus("Failed to get Solana public key");
      return;
    }

    await contract.addAccount(accountId, authIdentity);
    setStatus("Solana address registration successful!");
  } catch (error) {
    console.error(error);
    setStatus(`Error during registration: ${(error as Error).message}`);
  } finally {
    setIsPending(false);
  }
};

export const handleSolanaAuthenticate = async ({
  contract,
  setStatus,
  setIsPending,
  wallet,
  accountId,
}: {
  contract: AbstractAccountContract;
  setStatus: (status: string) => void;
  setIsPending: (isPending: boolean) => void;
  wallet: SolanaWalletType;
  accountId: string;
}) => {
  setIsPending(true);
  try {
    const solana = new Solana();
    Solana.setWallet(wallet);

    const account = await contract.getAccountById(accountId);
    if (!account || !contract) {
      setStatus("Failed to get account or initialize contract");
      return;
    }

    const authIdentity = await solana.getAuthIdentity();
    if (!authIdentity) {
      setStatus("Failed to get Solana public key");
      return;
    }

    const transaction = mockTransaction();

    const canonical = canonicalize(transaction);
    if (!canonical) {
      setStatus("Failed to canonicalize transaction");
      return;
    }

    const solanaData = await solana.sign(canonical);
    if (!solanaData) {
      setStatus("Failed to sign message");
      return;
    }

    await contract.auth({
      account_id: accountId,
      selected_auth_identity: undefined,
      auth: {
        authenticator: {
          Wallet: {
            wallet_type: AuthIdentityWalletType.Solana,
            public_key: authIdentity.Wallet.public_key,
          },
        },
        credentials: {
          signature: solanaData.signature,
        },
      },
      transaction: {
        Sign: transaction,
      },
    });

    setStatus("Solana authentication successful!");
  } catch (error) {
    console.error(error);
    setStatus(`Error during authentication: ${(error as Error).message}`);
  } finally {
    setIsPending(false);
  }
};
