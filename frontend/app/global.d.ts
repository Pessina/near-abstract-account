import type { EIP1193Provider } from 'viem';
import type { Wallet } from '@solana/wallet-adapter-base';

declare global {
  interface Window {
    // Ethereum wallets
    ethereum?: EIP1193Provider;
    okxwallet?: EIP1193Provider;

    // Solana wallets
    solana?: Wallet;
    solflare?: Wallet;
  }
}

export {}