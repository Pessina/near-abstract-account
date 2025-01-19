import canonicalize from "canonicalize";
import { Ethereum, WalletType } from "@/lib/auth/Ethereum/Ethereum";
import { mockTransaction } from "@/lib/constants";
import { AbstractAccountContract } from "@/contracts/AbstractAccountContract/AbstractAccountContract";
import { WalletType as AuthIdentityWalletType } from "@/contracts/AbstractAccountContract/types/auth";
export const handleEthereumRegister = async ({
  contract,
  setStatus,
  setIsPending,
  wallet,
  accountId,
}: {
  contract: AbstractAccountContract;
  setStatus: (status: string) => void;
  setIsPending: (isPending: boolean) => void;
  wallet: WalletType;
  accountId: string;
}) => {
  setIsPending(true);
  try {
    const ethereum = new Ethereum();
    Ethereum.setWallet(wallet);

    const authIdentity = await ethereum.getAuthIdentity();
    if (!authIdentity) {
      setStatus("Failed to get compressed public key");
      return;
    }

    await contract.addAccount(accountId, {
      Wallet: {
        wallet_type: AuthIdentityWalletType.Ethereum,
        public_key: authIdentity.Wallet.public_key,
      },
    });
    setStatus("Ethereum address registration successful!");
  } catch (error) {
    console.error(error);
    setStatus(`Error during registration: ${(error as Error).message}`);
  } finally {
    setIsPending(false);
  }
};

export const handleEthereumAuthenticate = async ({
  contract,
  setStatus,
  setIsPending,
  wallet,
  accountId,
}: {
  contract: AbstractAccountContract;
  setStatus: (status: string) => void;
  setIsPending: (isPending: boolean) => void;
  wallet: WalletType;
  accountId: string;
}) => {
  setIsPending(true);
  try {
    const ethereum = new Ethereum();
    Ethereum.setWallet(wallet);

    const account = await contract.getAccountById(accountId);
    if (!account) {
      setStatus("Failed to get account");
      return;
    }

    const transaction = mockTransaction();

    const canonical = canonicalize({
      Sign: transaction,
    });
    if (!canonical) {
      setStatus("Failed to canonicalize transaction");
      return;
    }

    const ethereumData = await ethereum.sign(canonical);
    if (!ethereumData) {
      setStatus("Failed to sign message");
      return;
    }

    const authIdentity = await ethereum.getAuthIdentity();
    if (!authIdentity) {
      setStatus("Failed to get compressed public key");
      return;
    }

    await contract.auth({
      account_id: accountId,
      auth: {
        authenticator: authIdentity,
        credentials: ethereumData,
      },
      transaction: {
        Sign: transaction,
      },
    });

    setStatus("Ethereum authentication successful!");
  } catch (error) {
    console.error(error);
    setStatus(`Error during authentication: ${(error as Error).message}`);
  } finally {
    setIsPending(false);
  }
};
