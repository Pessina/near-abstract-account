"use client";

import { useState, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import * as anchor from "@coral-xyz/anchor";

const PROGRAM_ID = "8KrLertSDNhWZ8hiYiPEeH8UnXs7Q7w9F52pwcbxXBcD";

import { Keypair } from "@solana/web3.js";

import crypto from "crypto";

const seed = "your-unique-counter-seed1";
const counterKeypair = Keypair.fromSeed(
  Buffer.from(crypto.createHash("sha256").update(seed).digest())
);

export default function Home() {
  const [message, setMessage] = useState<string>(
    "Connect your wallet to interact with the contract"
  );
  const [program, setProgram] = useState<anchor.Program | null>(null);

  const { connection } = useConnection();
  const wallet = useWallet();

  useEffect(() => {
    const fetchIdl = async () => {
      if (wallet.connected) {
        const provider = new anchor.AnchorProvider(
          connection,
          wallet as unknown as anchor.Wallet,
          { commitment: "confirmed" }
        );

        const fetchedIdl = await anchor.Program.fetchIdl(PROGRAM_ID, provider);

        const anchorProgram = new anchor.Program(fetchedIdl, provider);

        console.log("Anchor Program:", fetchedIdl);

        console.log("Anchor Program:", Object.keys(anchorProgram.methods));

        setProgram(anchorProgram);
      }
    };

    fetchIdl();
  }, [wallet.connected, connection, wallet]);

  const initializeContract = async () => {
    if (!wallet.publicKey || !wallet.signTransaction || !program) {
      setMessage("Wallet not fully connected");
      return;
    }

    const tx = await program.methods.initialize().rpc();
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();
    await connection.confirmTransaction(
      {
        signature: tx,
        blockhash,
        lastValidBlockHeight,
      },
      "confirmed"
    );
    console.log("Transaction confirmed:", tx);
  };

  const initializeCounter = async () => {
    if (!wallet.publicKey || !wallet.signTransaction || !program) {
      setMessage("Wallet not fully connected");
      return;
    }

    const tx = await program.methods
      .initializeCounter()
      .accounts({
        counter: counterKeypair.publicKey,
      })
      .signers([counterKeypair])
      .rpc();
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();
    await connection.confirmTransaction(
      {
        signature: tx,
        blockhash,
        lastValidBlockHeight,
      },
      "confirmed"
    );
    console.log("Transaction confirmed:", tx);

    // const currentCount = await program.account.counter.fetch(
    //   counterKeyPair.publicKey
    // );

    // console.log("Current count:", currentCount.count);
  };

  const verify = async () => {
    if (!wallet.publicKey || !wallet.signTransaction || !program) {
      setMessage("Wallet not fully connected");
      return;
    }

    const tx = await program.methods
      .verify(
        "eyJhbGciOiJSUzI1NiIsImtpZCI6ImVlMTkzZDQ2NDdhYjRhMzU4NWFhOWIyYjNiNDg0YTg3YWE2OGJiNDIiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiI3Mzk5MTEwNjk3OTctaWRwMDYyODY2OTY0Z2JuZG82NjkzaDMydGdhNWN2bDEuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiI3Mzk5MTEwNjk3OTctaWRwMDYyODY2OTY0Z2JuZG82NjkzaDMydGdhNWN2bDEuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMTc5MDI4NTUzNzMxNTc0MTAzMzAiLCJlbWFpbCI6ImZzLnBlc3NpbmFAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5iZiI6MTc0MjQzNjUzOCwibmFtZSI6IkZlbGlwZSBQZXNzaW5hIiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0pLSmJVeUJWcUNCdjRxVkdPRFNuVlRnTEhQS04wdFZPTUlNWFZpdWtncmQtMHRmZWRVPXM5Ni1jIiwiZ2l2ZW5fbmFtZSI6IkZlbGlwZSIsImZhbWlseV9uYW1lIjoiUGVzc2luYSIsImlhdCI6MTc0MjQzNjgzOCwiZXhwIjoxNzQyNDQwNDM4LCJqdGkiOiJlOWI2NTM3MGUzOTdjNjBiNmJjNWExYjYxZDkxMjM3NmRlNTU3YzQ3In0.R-suNXbwxS4vnNu4cOQ65WgSjj8Gbyf7e1sMYJJvOxCq3UdvhwJeJHS7qIdvDKLsjW_piUbj5SZndHyzpXUrbn0Dh7b4Gs00A-gNAt8QEBU6zno89O8W4Aev2mRIY75wXTDVGIxi_NVdwyXPC_AfMAnHI5ZTUmvxcKNXDHCD3LkOdnwHn_jW4Tn83LTxUwbdu2Ma7m4BiZwodb6pO5Fo5hb4dXGEtTbQBbU5HjxZSYy1myLuI8CsNlraCO4NlLJY2JtT27RsJzH9f0bh2MoSD4iDG-abEopPiP7KomH4l8enfQpKRe1hhjTolkJVihFL2k7OYVttiX-Zh0Q8Olqong",
        "rxLSY1w1gu-IzjVkBEqZXWcA1adZ15VmGpPYKpt8N_MXbgwICCy__iPVvuvSqetTvshwxEEK8ZcbmEyG_rcPiIBBoHYdtVb_cTlNR7JfT2ZOFKZUW1y3FBnZ2TTBHCgCJ9N7d-r6doQ-NI0GXOWzZh5Q9CPc9NDZoe8RfH-RE4m1RNGAukKThomofesSyw5OY92WxK9sfwTshmlK-J-wFB2OlN7xuwF3Rns_CJLdnajhf5XVMdNqEeSk3Fyoi72qWRQbDhfEhT5qcpkMX42BgWbmlom0ZPwPPhyyd9jrfFNN0BNgvF2kPD2eJ8qsaaUAZn4DBvcTpC5RhiwSY_AB8w",
        "AQAB"
      )
      .rpc();
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();
    await connection.confirmTransaction(
      {
        signature: tx,
        blockhash,
        lastValidBlockHeight,
      },
      "confirmed"
    );
    console.log("Transaction confirmed:", tx);

    // const currentCount = await program.account.counter.fetch(
    //   counterKeyPair.publicKey
    // );

    // console.log("Current count:", currentCount.count);
  };

  const incrementCounter = async () => {
    if (!wallet.publicKey || !wallet.signTransaction || !program) {
      setMessage("Wallet not fully connected");
      return;
    }

    const tx = await program.methods
      .increment()
      .accounts({
        counter: counterKeypair.publicKey,
      })
      .rpc();
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();
    await connection.confirmTransaction(
      {
        signature: tx,
        blockhash,
        lastValidBlockHeight,
      },
      "confirmed"
    );
    console.log("Transaction confirmed:", tx);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="w-full max-w-4xl flex flex-col items-center">
        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
          Solana Contract Demo
        </h1>
        <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md mb-6 w-full">
          <p className="text-lg">{message}</p>
        </div>
        {wallet.connected && (
          <>
            <button onClick={initializeContract}>Initialize Contract</button>
            <button onClick={initializeCounter}>Initialize Counter</button>
            <button onClick={incrementCounter}>Increment Counter</button>
            <button onClick={verify}>Verify</button>
          </>
        )}
      </div>
    </main>
  );
}
