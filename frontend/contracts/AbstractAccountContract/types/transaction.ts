import { AuthIdentity } from "../AbstractAccountContract";

import {
  WebAuthnCredentials,
  WalletCredentials,
  OIDCCredentials,
} from "./auth";

export interface Signature {
  big_r: {
    affine_point: string;
  };
  s: {
    scalar: string;
  };
  recovery_id: number;
}

export type Credentials =
  | WebAuthnCredentials
  | WalletCredentials
  | OIDCCredentials;

export interface Auth {
  auth_identity: AuthIdentity;
  credentials: Credentials;
}

export interface SignRequest {
  payload: number[];
  path: string;
  key_version: number;
}

export interface SignPayloadsRequest {
  contract_id: string;
  payloads: SignRequest[];
}

export interface TransactionData {
  account_id: string;
  nonce: string; // u128 maps to string in JS
  action: Action;
}

export type Action =
  | { RemoveAccount: null }
  | { AddAuthIdentity: Auth }
  | { RemoveAuthIdentity: AuthIdentity }
  | { Sign: SignPayloadsRequest };

export interface UserOp {
  auth: Auth;
  act_as?: AuthIdentity; // Optional field
  transaction: TransactionData;
}
