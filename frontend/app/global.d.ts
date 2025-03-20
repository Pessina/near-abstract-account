import type { Wallet } from "@solana/wallet-adapter-base";
import type { EIP1193Provider } from "viem";

declare global {
  interface Window {
    // Ethereum wallets
    ethereum?: EIP1193Provider;
    okxwallet?: EIP1193Provider;

    // Solana wallets
    solflare?: Wallet;
  }
}

export {};
