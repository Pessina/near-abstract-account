import { Contract, Account } from "near-api-js";
import { WebAutahnAuthData } from "../auth/WebAuthn/types";
import { EthereumAuthData } from "../auth/Ethereum/types";
import { SolanaAuthData } from "../auth/Solana/types";


export interface FunctionCallAction {
  FunctionCall: {
    method_name: string;
    args: string;
    gas: string;
    deposit: string;
  }
}

export interface TransferAction {
  Transfer: {
    deposit: string;
  }
}

export type Action = FunctionCallAction | TransferAction;

export interface Transaction {
  nonce: string;
  receiver_id: string;
  actions: Action[];
}

export interface Auth {
  auth_type: string;
  auth_key_id: string;
  auth_data: WebAutahnAuthData | EthereumAuthData | SolanaAuthData;
}

export interface UserOperation {
  auth: Auth;
  transaction: Transaction;
}

type AbstractContract = Contract & {
  add_auth_key: (args: { key_id: string, auth_key: string }) => Promise<void>;
  get_auth_key: (args: { key_id: string }) => Promise<string | null>;
  get_nonce: () => Promise<number>;
  set_auth_contract: (args: { auth_type: string, auth_contract_account_id: string }) => Promise<void>;
  auth: (args: { user_op: UserOperation }, gas?: string) => Promise<void>;
}

export class AbstractAccountContract {
  private contract: AbstractContract;

  constructor({
    account,
    contractId,
  }: {
    account: Account;
    contractId: string;
  }) {
    this.contract = new Contract(
      account,
      contractId,
      {
        viewMethods: ['get_auth_key', 'get_nonce'],
        changeMethods: ['add_auth_key', 'set_auth_contract', 'auth'],
        useLocalViewExecution: false
      }
    ) as unknown as AbstractContract;
  }

  async addAuthKey(keyId: string, authKey: string): Promise<void> {
    return await this.contract.add_auth_key({
      key_id: keyId,
      auth_key: authKey
    });
  }

  async getAuthKey(keyId: string): Promise<string | null> {
    return await this.contract.get_auth_key({ key_id: keyId });
  }

  async getNonce(): Promise<number> {
    return await this.contract.get_nonce();
  }

  async setAuthContract(authType: string, authContractAccountId: string): Promise<void> {
    return await this.contract.set_auth_contract({
      auth_type: authType,
      auth_contract_account_id: authContractAccountId
    });
  }

  async auth(userOp: UserOperation): Promise<void> {
    return await this.contract.auth({ user_op: userOp }, "300000000000000");
  }
}
