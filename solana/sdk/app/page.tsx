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
          </>
        )}
      </div>
    </main>
  );
}
