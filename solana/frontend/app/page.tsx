"use client";

import { useState, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { 
  PublicKey, 
  SendTransactionError,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  BlockhashWithExpiryBlockHeight,
  Connection,
  Commitment
} from "@solana/web3.js";

// Define our program ID
const PROGRAM_ID = new PublicKey("4bGmWPXzFXWJABf5YV5KaStvnpPuvFBxVxB49ssqZHZL");

// Type for transaction errors
interface SolanaError extends Error {
  message: string;
}

// The initialize instruction discriminator for Anchor (this is how Anchor identifies the instruction)
const INITIALIZE_IX_DISCRIMINATOR = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]);

// Helper function to get blockhash with timeout
const getBlockhashWithTimeout = async (
  connection: Connection, 
  timeoutMs = 15000
): Promise<BlockhashWithExpiryBlockHeight> => {
  const timeoutPromise = new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error(`Blockhash request timed out after ${timeoutMs}ms`)), timeoutMs)
  );
  
  try {
    return await Promise.race([
      connection.getLatestBlockhash("confirmed" as Commitment),
      timeoutPromise
    ]);
  } catch (error) {
    console.error("Error getting blockhash:", error);
    throw error;
  }
};

export default function Home() {
  const [message, setMessage] = useState<string>("Connect your wallet to interact with the contract");
  const [contractInitialized, setContractInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorLogs, setErrorLogs] = useState<string[]>([]);
  
  const { connection } = useConnection();
  const wallet = useWallet();
  
  useEffect(() => {
    if (wallet.connected && wallet.publicKey) {
      const publicKeyStr = wallet.publicKey.toBase58();
      setMessage(`Connected with: ${publicKeyStr.slice(0, 4)}...${publicKeyStr.slice(-4)}`);
    } else {
      setMessage("Connect your wallet to interact with the contract");
      setContractInitialized(false);
    }
  }, [wallet.connected, wallet.publicKey]);
  
  const initializeContract = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      setMessage("Wallet not fully connected");
      return;
    }
    
    setIsLoading(true);
    setErrorLogs([]);
    
    try {
      // Create the initialize instruction with the correct Anchor discriminator
      const instruction = new TransactionInstruction({
        keys: [], // No accounts needed for this initialize function
        programId: PROGRAM_ID,
        data: INITIALIZE_IX_DISCRIMINATOR // Use the Anchor discriminator
      });
      
      // Get latest blockhash with timeout
      const { blockhash } = await getBlockhashWithTimeout(connection);
      console.log("Received blockhash:", blockhash.substring(0, 10) + "...");
      
      // Create a versioned transaction
      const messageV0 = new TransactionMessage({
        payerKey: wallet.publicKey,
        recentBlockhash: blockhash,
        instructions: [instruction]
      }).compileToV0Message();
      
      const transaction = new VersionedTransaction(messageV0);
      
      // Sign the transaction
      const signedTransaction = await wallet.signTransaction(transaction);
      
      // Send the transaction with options
      const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed",
        maxRetries: 3
      });
      
      console.log("Transaction sent, signature:", signature);
      
      // Wait for confirmation with timeout
      const confirmationPromise = connection.confirmTransaction(
        { 
          signature, 
          blockhash, 
          lastValidBlockHeight: await connection.getBlockHeight() + 150 // Use current block height + buffer
        },
        "confirmed"
      );
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Transaction confirmation timed out")), 30000)
      );
      
      try {
        const confirmation = await Promise.race([confirmationPromise, timeoutPromise]);
        
        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${confirmation.value.err.toString()}`);
        }
        
        console.log("Transaction confirmed:", signature);
        
        // Update UI state
        const programIdStr = PROGRAM_ID.toBase58();
        setMessage(`Successfully connected to contract: ${programIdStr.slice(0, 4)}...${programIdStr.slice(-4)}`);
        setContractInitialized(true);
      } catch (error: unknown) {
        const solError = error as SolanaError;
        if (solError.message && solError.message.includes("block height exceeded")) {
          // The transaction might still have been successful, let's check
          try {
            console.log("Blockhash expired, checking transaction status directly...");
            // Check if the transaction was actually successful despite blockhash expiration
            const status = await connection.getSignatureStatus(signature, {searchTransactionHistory: true});
            
            if (status && status.value && !status.value.err) {
              console.log("Transaction was successful despite blockhash expiration:", status);
              const programIdStr = PROGRAM_ID.toBase58();
              setMessage(`Successfully connected to contract: ${programIdStr.slice(0, 4)}...${programIdStr.slice(-4)}`);
              setContractInitialized(true);
              return;
            }
          } catch (statusCheckError) {
            console.error("Error checking transaction status:", statusCheckError);
          }
        }
        
        throw error; // Re-throw the error to be caught by the outer catch block
      }
    } catch (error) {
      console.error("Error initializing contract:", error);
      
      // Handle SendTransactionError specifically to get logs
      if (error instanceof SendTransactionError) {
        const logs = error.logs || [];
        setErrorLogs(logs);
        console.log("Transaction error logs:", logs);
      }
      
      setMessage(`Error initializing contract: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
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
          {wallet.connected && !contractInitialized && (
          <button
            onClick={initializeContract}
            disabled={isLoading}
            className={`px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Initializing...' : 'Initialize Contract'}
          </button>
        )}
          {contractInitialized && (
          <div className="mt-8 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
            <p className="text-green-600 dark:text-green-400 font-semibold">Contract initialized successfully!</p>
          </div>
        )}
          {errorLogs.length > 0 && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg w-full">
            <h3 className="text-red-700 dark:text-red-400 font-semibold mb-2">Error Logs:</h3>
            <pre className="text-xs overflow-auto max-h-60 p-2 bg-gray-800 text-gray-200 rounded">
              {errorLogs.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}
