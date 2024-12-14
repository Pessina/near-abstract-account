import { Contract, Account as NearAccount } from "near-api-js";
import { WebAutahnAuthData } from "../auth/WebAuthn/types";
import { EthereumAuthData } from "../auth/Ethereum/types";
import { SolanaAuthData } from "../auth/Solana/types";

export interface FunctionCallAction {
  FunctionCall: {
    method_name: string;
    args: string;
    gas: string;
    deposit: string;
  };
}

export interface TransferAction {
  Transfer: {
    deposit: string;
  };
}

export type Action = FunctionCallAction | TransferAction;

export interface Transaction {
  nonce: string;
  receiver_id: string;
  actions: Action[];
}

export type WalletType = "Ethereum" | "Solana";

export interface Wallet {
  wallet_type: WalletType;
  compressed_public_key: string;
}

export interface WebAuthn {
  key_id: string;
  compressed_public_key?: string;
}

export interface OIDC {
  client_id: string;
  issuer: string;
  email: string;
}

export type AuthIdentity =
  | { Wallet: Wallet }
  | { WebAuthn: WebAuthn }
  | { OIDC: OIDC }
  | { Account: string };

export interface Auth {
  auth_identity: AuthIdentity;
  auth_data: WebAutahnAuthData | EthereumAuthData | SolanaAuthData;
}

export interface UserOperation {
  account_id: string;
  auth: Auth;
  transaction: Transaction;
}

export interface Account {
  nonce: number;
  auth_identities: AuthIdentity[];
}

type AbstractContract = Contract & {
  new: () => Promise<void>;
  add_account: (args: {
    account_id: string;
    auth_identity: AuthIdentity;
  }) => Promise<void>;
  get_account_by_id: (args: { account_id: string }) => Promise<Account | null>;
  set_auth_contract: (args: {
    auth_type: string;
    auth_contract_account_id: string;
  }) => Promise<void>;
  auth: (args: { user_op: UserOperation }, gas?: string) => Promise<void>;
};

export class AbstractAccountContract {
  private contract: AbstractContract;

  constructor({
    account,
    contractId,
  }: {
    account: NearAccount;
    contractId: string;
  }) {
    this.contract = new Contract(account, contractId, {
      viewMethods: ["get_account_by_id"],
      changeMethods: ["new", "add_account", "set_auth_contract", "auth"],
      useLocalViewExecution: false,
    }) as unknown as AbstractContract;
  }

  async new(): Promise<void> {
    return await this.contract.new();
  }

  async addAccount(
    accountId: string,
    authIdentity: AuthIdentity
  ): Promise<void> {
    return await this.contract.add_account({
      account_id: accountId,
      auth_identity: authIdentity,
    });
  }

  async getAccountById(accountId: string): Promise<Account | null> {
    return await this.contract.get_account_by_id({ account_id: accountId });
  }

  async setAuthContract(
    authType: string,
    authContractAccountId: string
  ): Promise<void> {
    return await this.contract.set_auth_contract({
      auth_type: authType,
      auth_contract_account_id: authContractAccountId,
    });
  }

  async auth(userOp: UserOperation): Promise<void> {
    return await this.contract.auth({ user_op: userOp }, "300000000000000");
  }
}
