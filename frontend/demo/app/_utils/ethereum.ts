import { AbstractAccountContract } from "@/lib/contract/AbstractAccountContract";
import canonicalize from "canonicalize";
import { Ethereum, WalletType } from "@/lib/auth/Ethereum/Ethereum";
import { mockTransaction } from "@/lib/constants";

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
    if (!Ethereum.isSupportedByBrowser()) {
      setStatus("Ethereum wallet is not supported by this browser");
      return;
    }

    Ethereum.setWallet(wallet);

    const ethAddress = await Ethereum.getCurrentAddress();
    if (!ethAddress || !contract) {
      setStatus("Failed to get Ethereum address or initialize contract");
      return;
    }

    const compressedPublicKey = await Ethereum.getCompressedPublicKey();
    if (!compressedPublicKey) {
      setStatus("Failed to get compressed public key");
      return;
    }

    await contract.addAccount(accountId, {
      Wallet: {
        chain: "Ethereum",
        compressed_public_key: compressedPublicKey,
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
    Ethereum.setWallet(wallet);

    const ethAddress = await Ethereum.getCurrentAddress();
    if (!ethAddress || !contract) {
      setStatus("Failed to get Ethereum address");
      return;
    }

    const account = await contract.getAccountById(accountId);
    if (!account) {
      setStatus("Failed to get account");
      return;
    }

    const transaction = mockTransaction(account.nonce);

    const canonical = canonicalize(transaction);
    if (!canonical) {
      setStatus("Failed to canonicalize transaction");
      return;
    }

    const ethereumData = await Ethereum.signMessage(canonical, ethAddress);
    if (!ethereumData) {
      setStatus("Failed to sign message");
      return;
    }

    const compressedPublicKey = await Ethereum.getCompressedPublicKey();
    if (!compressedPublicKey) {
      setStatus("Failed to get compressed public key");
      return;
    }

    await contract.auth({
      account_id: accountId,
      auth: {
        auth_identity: {
          Wallet: {
            chain: "Ethereum",
            compressed_public_key: compressedPublicKey,
          },
        },
        auth_data: ethereumData,
      },
      transaction,
    });

    setStatus("Ethereum authentication successful!");
  } catch (error) {
    console.error(error);
    setStatus(`Error during authentication: ${(error as Error).message}`);
  } finally {
    setIsPending(false);
  }
};
