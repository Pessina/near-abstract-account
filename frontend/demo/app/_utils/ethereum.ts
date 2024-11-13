import { AbstractAccountContract } from "@/lib/contract/AbstractAccountContract";
import canonicalize from "canonicalize";
import { Ethereum, WalletType } from "@/lib/auth/Ethereum/Ethereum";

export const handleEthereumRegister = async ({
  contract,
  setStatus,
  setIsPending,
  wallet,
}: {
  contract: AbstractAccountContract;
  setStatus: (status: string) => void;
  setIsPending: (isPending: boolean) => void;
  wallet: WalletType;
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

    await contract.addAuthKey(ethAddress, ethAddress);
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
}: {
  contract: AbstractAccountContract;
  setStatus: (status: string) => void;
  setIsPending: (isPending: boolean) => void;
  wallet: WalletType;
}) => {
  setIsPending(true);
  try {
    Ethereum.setWallet(wallet);

    const nonce = await contract?.getNonce();
    if (nonce === undefined || !contract) {
      setStatus("Failed to get nonce or initialize contract");
      return;
    }

    const ethAddress = await Ethereum.getCurrentAddress();
    if (!ethAddress) {
      setStatus("Failed to get Ethereum address");
      return;
    }

    const transaction = {
      receiver_id: "v1.signer-prod.testnet",
      nonce: nonce.toString(),
      actions: [
        { Transfer: { deposit: "1000000000000000000000" } },
        {
          FunctionCall: {
            method_name: "sign",
            args: JSON.stringify({
              request: {
                path: "ethereum,1",
                payload: Array(32)
                  .fill(0)
                  .map((_, i) => i % 10),
                key_version: 0,
              },
            }),
            gas: "50000000000000",
            deposit: "250000000000000000000000",
          },
        },
      ],
    };

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

    await contract.auth({
      auth: {
        auth_type: "ethereum",
        auth_key_id: ethAddress,
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
