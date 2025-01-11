import { Hex } from "viem";

export interface WebAuthnAuthIdentity {
  key_id: string;
  compressed_public_key?: string;
}

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

export interface WebAuthnAuthData {
  signature: string;
  authenticator_data: string;
  client_data: string;
}
