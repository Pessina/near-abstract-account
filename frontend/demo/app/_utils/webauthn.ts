import { WebAuthn } from "@/lib/auth/WebAuthn/WebAuthn";
import canonicalize from "canonicalize";
import { AbstractAccountContract } from "@/lib/contract/AbstractAccountContract";

export const handlePasskeyRegister = async ({
  username,
  contract,
  setStatus,
  setIsPending,
}: {
  username: string;
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

    await contract.addAuthKey(credential.rawId, credential.compressedPublicKey);
    setStatus("Passkey registration successful!");
  } catch (error) {
    console.error(error);
    setStatus(`Error during registration: ${(error as Error).message}`);
  } finally {
    setIsPending(false);
  }
};

export const handlePasskeyAuthenticate = async ({
  contract,
  setStatus,
  setIsPending,
}: {
  contract: AbstractAccountContract;
  setStatus: (status: string) => void;
  setIsPending: (isPending: boolean) => void;
}) => {
  setIsPending(true);
  try {
    const nonce = await contract?.getNonce();
    if (nonce === undefined || !contract) {
      setStatus("Failed to get nonce or initialize contract");
      return;
    }

    const transaction = {
      receiver_id: "felipe-sandbox-account.testnet",
      nonce: nonce.toString(),
      actions: [
        { Transfer: { deposit: "10000000000000000000" } },
        // {
        //   FunctionCall: {
        //     method_name: "sign",
        //     args: JSON.stringify({
        //       request: {
        //         path: "ethereum,1",
        //         payload: Array(32).fill(0).map((_, i) => i % 10),
        //         key_version: 0
        //       }
        //     }),
        //     gas: "50000000000000",
        //     deposit: "250000000000000000000000"
        //   }
        // }
      ],
    };

    const canonical = canonicalize(transaction);
    const challenge = new TextEncoder().encode(canonical);
    const challengeHash = await crypto.subtle.digest("SHA-256", challenge);

    const credential = await WebAuthn.get(new Uint8Array(challengeHash));
    if (!credential) {
      setStatus("Failed to get credential");
      return;
    }

    // Test code for signature
    // credential.signature.r = "0x573a2aba62db8a60c0877a87a2c6db9637bba0b7d8fd505628947e763371c016"

    await contract.auth({
      auth: {
        auth_type: "webauthn",
        auth_key_id: credential.rawId,
        auth_data: {
          signature: credential.signature,
          authenticator_data: credential.authenticatorData,
          client_data: JSON.stringify(credential.clientData),
        },
      },
      transaction,
    });

    setStatus("Passkey authentication successful!");
  } catch (error) {
    console.error(error);
    setStatus(`Error during authentication: ${(error as Error).message}`);
  } finally {
    setIsPending(false);
  }
};
