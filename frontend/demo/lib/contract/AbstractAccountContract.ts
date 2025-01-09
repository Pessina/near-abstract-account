import { Contract, Account as NearAccount } from "near-api-js";
import { WebAutahnAuthData } from "../auth/WebAuthn/types";
import { EthereumAuthData } from "../auth/Ethereum/types";
import { SolanaAuthData } from "../auth/Solana/types";

export interface SignRequest {
  payload: number[];
  path: string;
  key_version: number;
}

export interface SignPayloadsRequest {
  contract_id: string;
  payloads: SignRequest[];
}

export type WalletType = "Ethereum" | "Solana";

export interface Wallet {
  wallet_type: WalletType;
  public_key: string;
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
  selected_auth_identity?: AuthIdentity;
  payloads: SignPayloadsRequest;
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
  send_transaction: (args: {
    args: { user_op: UserOperation };
    gas?: string;
    amount?: string;
  }) => Promise<void>;
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
      changeMethods: ["new", "add_account", "send_transaction"],
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

  async sendTransaction(userOp: UserOperation): Promise<void> {
    console.log("Sending transaction");
    return await this.contract.send_transaction({
      args: { user_op: userOp },
      gas: "300000000000000",
      amount: "10000000000000000000000",
    });
  }
}
