"use client";

import { useState, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import * as anchor from "@coral-xyz/anchor";

const PROGRAM_ID = "4bGmWPXzFXWJABf5YV5KaStvnpPuvFBxVxB49ssqZHZL";

export default function Home() {
  const [message, setMessage] = useState<string>(
    "Connect your wallet to interact with the contract"
  );
  const [isLoading, setIsLoading] = useState(false);
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

        setProgram(anchorProgram);
      }
    };

    if (wallet.connected) {
      fetchIdl();
    }
  }, [wallet.connected, connection, wallet]);

  const initializeContract = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      setMessage("Wallet not fully connected");
      return;
    }

    setIsLoading(true);

    if (program) {
      const tx = await program.methods.initialize().rpc();
      console.log("Transaction sent via Anchor, signature:", tx);
      await connection.confirmTransaction(tx, "confirmed");
      console.log("Transaction confirmed:", tx);
    }
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
          <button
            onClick={initializeContract}
            disabled={isLoading}
            className={`px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-colors ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isLoading ? "Initializing..." : "Initialize Contract"}
          </button>
        )}
      </div>
    </main>
  );
}
