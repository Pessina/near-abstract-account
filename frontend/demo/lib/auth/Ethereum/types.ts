
export interface Signature {
  r: string;
  s: string; 
  v: string;
}

export interface EthereumAuthData {
  message: string;
  signature: Signature;
}