
export type SolanaWalletType = 'phantom' | 'solflare';

export interface SolanaAuthData {
  message: string;
  signature: string;
  publicKey: string;
}