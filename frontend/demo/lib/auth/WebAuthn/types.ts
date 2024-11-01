import { Hex } from "viem";

export type CreateCredential = {
  rawId: Hex;
  compressedPublicKey: string;
};

export type P256Credential = {
  rawId: Hex;
  clientData: ClientData;
  authenticatorData: Hex;
  signature: P256Signature;
};

export type P256Signature = {
  r: Hex;
  s: Hex;
};

export type ClientData = {
  type: string;
  challenge: string;
  origin: string;
  crossOrigin?: boolean;
};
