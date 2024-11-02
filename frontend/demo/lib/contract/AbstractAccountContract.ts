import { Contract, Account } from "near-api-js";

export interface WebAuthnData {
  signature: string;
  authenticator_data: string;
  client_data: string;
}

export interface Auth {
  auth_type: string;
  auth_data: Record<string, unknown>;
}

export interface UserOperation {
  auth: Auth;
}

export interface WebAuthnAuth {
  compressed_public_key: string;
  webauthn_data: WebAuthnData;
}

type AbstractContract = Contract & {
  add_public_key: (args: { compressed_public_key: string }) => Promise<void>;
  has_public_key: (args: { compressed_public_key: string }) => Promise<boolean>;
  add_auth_contract: (args: { auth_type: string, auth_contract_account_id: string }) => Promise<void>;
  auth: (args: { user_op: UserOperation }, gas: string) => Promise<void>;
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
        viewMethods: ['has_public_key'],
        changeMethods: ['add_public_key', 'add_auth_contract', 'auth'],
        useLocalViewExecution: false
      }
    ) as unknown as AbstractContract;
  }

  async addPublicKey(compressedPublicKey: string): Promise<void> {
    return await this.contract.add_public_key({ compressed_public_key: compressedPublicKey });
  }

  async hasPublicKey(compressedPublicKey: string): Promise<boolean> {
    return await this.contract.has_public_key({ compressed_public_key: compressedPublicKey });
  }

  async addAuthContract(authType: string, authContractAccountId: string): Promise<void> {
    return await this.contract.add_auth_contract({
      auth_type: authType,
      auth_contract_account_id: authContractAccountId
    });
  }

  async auth(userOp: UserOperation): Promise<void> {
    return await this.contract.auth({ user_op: userOp}, "300000000000000");
  }
}
