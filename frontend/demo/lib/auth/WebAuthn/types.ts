import { Hex } from "viem";

export type P256Credential = {
  rawId: Hex;
  clientData: ClientData;
  authenticatorData: Hex;
  signature: string;
};

export type ClientData = {
  type: string;
  challenge: string;
  origin: string;
  crossOrigin?: boolean;
};
