import { Contract, Account as NearAccount } from "near-api-js";
import {
  WebAuthnAuthIdentity,
  WalletAuthIdentity,
  WebAuthnCredentials,
  WalletCredentials,
  OIDCCredentials,
  OIDCAuthIdentity,
} from "./types/auth";
import { Signature, Transaction } from "./types/transaction";
import { ContractChangeMethodArgs } from "../types";

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

export type AbstractAccountContract = Contract & {
  add_account: (
    args: ContractChangeMethodArgs<{
      account_id: string;
      auth_identity: AuthIdentity;
    }>
  ) => Promise<void>;
  delete_account: (
    args: ContractChangeMethodArgs<{
      account_id: string;
    }>
  ) => Promise<void>;
  add_auth_identity: (
    args: ContractChangeMethodArgs<{
      account_id: string;
      auth_identity: AuthIdentity;
    }>
  ) => Promise<void>;
  remove_auth_identity: (
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
  auth: (
    args: ContractChangeMethodArgs<{
      user_op: UserOperation;
    }>
  ) => Promise<Signature>;
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
      ],
      changeMethods: [
        "add_account",
        "delete_account",
        "add_auth_identity",
        "remove_auth_identity",
        "auth",
      ],
      useLocalViewExecution: false,
    }) as unknown as AbstractAccountContract;
  }

  async addAccount(obj: Parameters<AbstractAccountContract["add_account"]>[0]) {
    return this.contract.add_account(obj);
  }

  async deleteAccount(
    obj: Parameters<AbstractAccountContract["delete_account"]>[0]
  ) {
    return this.contract.delete_account(obj);
  }

  async addAuthIdentity(
    obj: Parameters<AbstractAccountContract["add_auth_identity"]>[0]
  ) {
    return this.contract.add_auth_identity(obj);
  }

  async removeAuthIdentity(
    obj: Parameters<AbstractAccountContract["remove_auth_identity"]>[0]
  ) {
    return this.contract.remove_auth_identity(obj);
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
}
