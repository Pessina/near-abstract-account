import { Contract, Account } from "near-api-js";

export interface WebAuthnData {
  signature: string;
  authenticator_data: string;
  client_data: string;
}

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
  auth_data: Record<string, unknown>;
}

export interface UserOperation {
  auth: Auth;
  transaction: Transaction;
}

export interface WebAuthnAuth {
  public_key_id: string;
  webauthn_data: WebAuthnData;
}

type AbstractContract = Contract & {
  add_public_key: (args: { key_id: string, compressed_public_key: string }) => Promise<void>;
  get_public_key: (args: { key_id: string }) => Promise<string | null>;
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
        viewMethods: ['get_public_key', 'get_nonce'],
        changeMethods: ['add_public_key', 'set_auth_contract', 'auth'],
        useLocalViewExecution: false
      }
    ) as unknown as AbstractContract;
  }

  async addPublicKey(keyId: string, compressedPublicKey: string): Promise<void> {
    return await this.contract.add_public_key({
      key_id: keyId,
      compressed_public_key: compressedPublicKey
    });
  }

  async getPublicKey(keyId: string): Promise<string | null> {
    return await this.contract.get_public_key({ key_id: keyId });
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
