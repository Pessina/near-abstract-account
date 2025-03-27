import type { Wallet } from "@solana/wallet-adapter-base";
import type { EIP1193Provider } from "viem";

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
    okxwallet?: EIP1193Provider;
    solflare?: Wallet;
  }
}

export {};
