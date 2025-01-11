export type SolanaWalletType = "phantom" | "solflare";

export interface SolanaAuthData {
  signature: string;
  publicKey: string;
}

export type SolanaAuthIdentity = {
  Wallet: {
    wallet_type: "Solana";
    public_key: string;
  };
};
