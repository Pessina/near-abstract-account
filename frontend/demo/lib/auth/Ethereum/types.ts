export interface EthereumAuthData {
  signature: string;
}

export type EthereumAuthIdentity = {
  Wallet: {
    wallet_type: "Ethereum";
    public_key: string;
  };
};
