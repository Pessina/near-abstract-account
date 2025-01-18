import { Contract, Account as NearAccount } from "near-api-js";
import { OIDCAuthIdentity } from "../types";
import {
  WebAuthnAuthIdentity,
  WalletAuthIdentity,
  WebAuthnCredentials,
  WalletCredentials,
  OIDCCredentials,
} from "./types/auth";
import { Signature, Transaction } from "./types/transaction";

export type AuthIdentity =
  | WebAuthnAuthIdentity
  | WalletAuthIdentity
  | OIDCAuthIdentity
  | {
      Account: string;
    };

export interface Auth {
  authenticator: AuthIdentity;
  credentials: WebAuthnCredentials | WalletCredentials | OIDCCredentials;
}

export interface UserOperation {
  account_id: string;
  auth: Auth;
  selected_auth_identity?: AuthIdentity;
  transaction: Transaction;
}

export interface Account {
  auth_identities: AuthIdentity[];
}

export enum AuthIdentityNames {
  WebAuthn = "WebAuthn",
  EthereumWallet = "EthereumWallet",
  SolanaWallet = "SolanaWallet",
  OIDC = "OIDC",
}

export interface AuthContractConfig {
  auth_type: AuthIdentityNames;
  contract_id: string;
}

type AbstractContract = Contract & {
  new: (args: {
    auth_contracts?: AuthContractConfig[];
    signer_account?: string;
  }) => Promise<void>;
  add_account: (args: {
    account_id: string;
    auth_identity: AuthIdentity;
  }) => Promise<void>;
  delete_account: (args: { account_id: string }) => Promise<void>;
  add_auth_identity: (args: {
    account_id: string;
    auth_identity: AuthIdentity;
  }) => Promise<void>;
  remove_auth_identity: (args: {
    account_id: string;
    auth_identity: AuthIdentity;
  }) => Promise<void>;
  get_account_by_id: (args: { account_id: string }) => Promise<Account | null>;
  list_account_ids: () => Promise<string[]>;
  list_auth_identities: (args: {
    account_id: string;
  }) => Promise<AuthIdentity[] | null>;
  get_account_by_auth_identity: (args: {
    auth_identity: AuthIdentity;
  }) => Promise<string[]>;
  get_all_contracts: () => Promise<string[]>;
  get_signer_account: () => Promise<string>;
  auth: (args: {
    args: { user_op: UserOperation };
    gas?: string;
    amount?: string;
  }) => Promise<Signature>;
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
      viewMethods: [
        "get_account_by_id",
        "list_account_ids",
        "list_auth_identities",
        "get_account_by_auth_identity",
        "get_all_contracts",
        "get_signer_account",
      ],
      changeMethods: [
        "add_account",
        "delete_account",
        "add_auth_identity",
        "remove_auth_identity",
        "auth",
      ],
      useLocalViewExecution: false,
    }) as unknown as AbstractContract;
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

  async deleteAccount(accountId: string): Promise<void> {
    return await this.contract.delete_account({
      account_id: accountId,
    });
  }

  async addAuthIdentity(
    accountId: string,
    authIdentity: AuthIdentity
  ): Promise<void> {
    return await this.contract.add_auth_identity({
      account_id: accountId,
      auth_identity: authIdentity,
    });
  }

  async removeAuthIdentity(
    accountId: string,
    authIdentity: AuthIdentity
  ): Promise<void> {
    return await this.contract.remove_auth_identity({
      account_id: accountId,
      auth_identity: authIdentity,
    });
  }

  async getAccountById(accountId: string): Promise<Account | null> {
    return await this.contract.get_account_by_id({ account_id: accountId });
  }

  async listAccountIds(): Promise<string[]> {
    return await this.contract.list_account_ids();
  }

  async listAuthIdentities(accountId: string): Promise<AuthIdentity[] | null> {
    return await this.contract.list_auth_identities({ account_id: accountId });
  }

  async getAccountByAuthIdentity(
    authIdentity: AuthIdentity
  ): Promise<string[]> {
    return await this.contract.get_account_by_auth_identity({
      auth_identity: authIdentity,
    });
  }

  async getAllContracts(): Promise<string[]> {
    return await this.contract.get_all_contracts();
  }

  async getSignerAccount(): Promise<string> {
    return await this.contract.get_signer_account();
  }

  async auth(userOp: UserOperation): Promise<Signature> {
    return await this.contract.auth({
      args: { user_op: userOp },
      gas: "300000000000000",
      amount: "10", // TODO: Use dynamic fee
    });
  }
}
