import { AbstractAccountContract } from "@/lib/contract/AbstractAccountContract";
import canonicalize from "canonicalize";
import { Solana } from "@/lib/auth/Solana";
import type { SolanaWalletType } from "@/lib/auth/Solana/types";
import { mockTransaction } from "@/lib/constants";

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
    Solana.setWallet(wallet);

    if (!Solana.isAvailable()) {
      setStatus("Solana wallet is not supported by this browser");
      return;
    }

    const publicKey = await Solana.getPublicKey();
    if (!publicKey || !contract) {
      setStatus("Failed to get Solana public key or initialize contract");
      return;
    }

    await contract.addAccount(accountId, {
      Wallet: {
        wallet_type: "Solana",
        public_key: publicKey,
      },
    });
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
    Solana.setWallet(wallet);

    const account = await contract.getAccountById(accountId);
    if (!account || !contract) {
      setStatus("Failed to get account or initialize contract");
      return;
    }

    const publicKey = await Solana.getPublicKey();
    if (!publicKey) {
      setStatus("Failed to get Solana public key");
      return;
    }

    const transaction = mockTransaction();

    const canonical = canonicalize(transaction);
    if (!canonical) {
      setStatus("Failed to canonicalize transaction");
      return;
    }

    const solanaData = await Solana.signMessage(canonical);
    if (!solanaData) {
      setStatus("Failed to sign message");
      return;
    }

    await contract.sendTransaction({
      account_id: accountId,
      selected_auth_identity: undefined,
      auth: {
        auth_identity: {
          Wallet: {
            wallet_type: "Solana",
            public_key: publicKey,
          },
        },
        auth_data: solanaData,
      },
      payloads: transaction,
    });

    setStatus("Solana authentication successful!");
  } catch (error) {
    console.error(error);
    setStatus(`Error during authentication: ${(error as Error).message}`);
  } finally {
    setIsPending(false);
  }
};
