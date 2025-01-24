import { Contract, Account as NearAccount } from "near-api-js";

import { ContractChangeMethodArgs } from "../types";

import {
  WebAuthnAuthenticator,
  WalletAuthenticator,
  WebAuthnCredentials,
  WalletCredentials,
  OIDCCredentials,
  OIDCAuthenticator,
} from "./types/auth";
import { SignPayloadsRequest } from "./types/transaction";

export interface StorageBalance {
  total: string;
  available: string;
}

export type IdentityPermissions = object | null;

export type AuthTypes =
  | WalletAuthenticator
  | WebAuthnAuthenticator
  | OIDCAuthenticator
  | { Account: string };

export interface AuthIdentity {
  authenticator: AuthTypes;
  permissions?: IdentityPermissions;
}

export interface Auth {
  auth_identity: AuthIdentity;
  credentials: WebAuthnCredentials | WalletCredentials | OIDCCredentials;
}

export type Action =
  | "RemoveAccount"
  | { AddAuthIdentity: Auth }
  | { RemoveAuthIdentity: AuthIdentity }
  | {
      Sign: SignPayloadsRequest;
    };

export interface Transaction {
  account_id: string;
  nonce: string;
  action: Action;
}

export interface UserOperation {
  auth: Auth;
  act_as?: AuthIdentity;
  transaction: Transaction;
}

export interface Account {
  auth_identities: AuthIdentity[];
  nonce: string;
}

export enum AuthTypeNames {
  EthereumWallet = "EthereumWallet",
  SolanaWallet = "SolanaWallet",
  WebAuthn = "WebAuthn",
  OIDC = "OIDC",
  Account = "Account",
}

export interface AuthContractConfig {
  auth_type: AuthTypeNames;
  contract_id: string;
}

export type AbstractAccountContract = Contract & {
  add_account: (
    args: ContractChangeMethodArgs<{
      account_id: string;
      auth_identity: AuthIdentity;
    }>
  ) => Promise<void>;
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
  auth: <T>(
    args: ContractChangeMethodArgs<{
      user_op: UserOperation;
    }>
  ) => Promise<T>;
  storage_balance_of: (args: {
    account_id: string;
  }) => Promise<StorageBalance | null>;
  storage_deposit: (
    args: ContractChangeMethodArgs<{
      account_id?: string;
      registration_only?: boolean;
    }>
  ) => Promise<StorageBalance>;
  storage_withdraw: (
    args: ContractChangeMethodArgs<{
      amount?: string;
    }>
  ) => Promise<StorageBalance>;
};

export class AbstractAccountContractClass {
  private contract: AbstractAccountContract;

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
        "storage_balance_of",
      ],
      changeMethods: [
        "add_account",
        "auth",
        "storage_deposit",
        "storage_withdraw",
      ],
      useLocalViewExecution: false,
    }) as unknown as AbstractAccountContract;
  }

  async addAccount(obj: Parameters<AbstractAccountContract["add_account"]>[0]) {
    return this.contract.add_account(obj);
  }

  async getAccountById(
    obj: Parameters<AbstractAccountContract["get_account_by_id"]>[0]
  ) {
    return this.contract.get_account_by_id(obj);
  }

  async listAccountIds() {
    return this.contract.list_account_ids();
  }

  async listAuthIdentities(
    obj: Parameters<AbstractAccountContract["list_auth_identities"]>[0]
  ) {
    return this.contract.list_auth_identities(obj);
  }

  async getAccountByAuthIdentity(
    obj: Parameters<AbstractAccountContract["get_account_by_auth_identity"]>[0]
  ) {
    return this.contract.get_account_by_auth_identity(obj);
  }

  async getAllContracts() {
    return this.contract.get_all_contracts();
  }

  async getSignerAccount() {
    return this.contract.get_signer_account();
  }

  async auth(obj: Parameters<AbstractAccountContract["auth"]>[0]) {
    return this.contract.auth(obj);
  }

  async storageBalanceOf(
    obj: Parameters<AbstractAccountContract["storage_balance_of"]>[0]
  ) {
    return this.contract.storage_balance_of(obj);
  }

  async storageDeposit(
    obj: Parameters<AbstractAccountContract["storage_deposit"]>[0]
  ) {
    return this.contract.storage_deposit(obj);
  }

  async storageWithdraw(
    obj: Parameters<AbstractAccountContract["storage_withdraw"]>[0]
  ) {
    return this.contract.storage_withdraw(obj);
  }
}
