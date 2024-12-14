import { Hex } from "viem";

export type CreateCredential = {
  rawId: Hex;
  compressedPublicKey: string;
};

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

export interface WebAutahnAuthData {
  signature: string;
  authenticator_data: string;
  client_data: string;
}
