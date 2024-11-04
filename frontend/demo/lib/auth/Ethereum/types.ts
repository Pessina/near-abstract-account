
export interface Signature {
  r: string;
  s: string; 
  v: string;
}

export interface EthereumData {
  message: string;
  signature: Signature;
}