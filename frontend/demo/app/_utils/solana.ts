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
}: {
  contract: AbstractAccountContract;
  setStatus: (status: string) => void;
  setIsPending: (isPending: boolean) => void;
  wallet: SolanaWalletType;
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

    await contract.addAuthKey(publicKey, publicKey);
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
}: {
  contract: AbstractAccountContract;
  setStatus: (status: string) => void;
  setIsPending: (isPending: boolean) => void;
  wallet: SolanaWalletType;
}) => {
  setIsPending(true);
  try {
    Solana.setWallet(wallet);

    const nonce = await contract?.getNonce();
    if (nonce === undefined || !contract) {
      setStatus("Failed to get nonce or initialize contract");
      return;
    }

    const publicKey = await Solana.getPublicKey();
    if (!publicKey) {
      setStatus("Failed to get Solana public key");
      return;
    }

    const transaction = mockTransaction(nonce);

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

    await contract.auth({
      auth: {
        auth_type: "solana",
        auth_key_id: publicKey,
        auth_data: solanaData,
      },
      transaction,
    });

    setStatus("Solana authentication successful!");
  } catch (error) {
    console.error(error);
    setStatus(`Error during authentication: ${(error as Error).message}`);
  } finally {
    setIsPending(false);
  }
};
