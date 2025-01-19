import { AuthIdentity } from "../AbstractAccountContract";

export interface Signature {
  big_r: {
    affine_point: string;
  };
  s: {
    scalar: string;
  };
  recovery_id: number;
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
export type Transaction =
  | {
      Sign: SignPayloadsRequest;
    }
  | {
      RemoveAccount: null;
    }
  | {
      AddAuthIdentity: AuthIdentity;
    }
  | {
      RemoveAuthIdentity: AuthIdentity;
    };
