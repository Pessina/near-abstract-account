import { Contract, Account as NearAccount } from "near-api-js";

export interface PublicKey {
  kid: string;
  n: string;
  e: string;
  alg: string;
  kty: string;
  use: string;
}

type OIDCAuthContractType = Contract & {
  update_keys: (args: { issuer: string; keys: PublicKey[] }) => Promise<void>;
  get_keys: () => Promise<[string, PublicKey[]][]>;
};

export class OIDCAuthContract {
  private contract: OIDCAuthContractType;

  constructor({
    account,
    contractId,
  }: {
    account: NearAccount;
    contractId: string;
  }) {
    this.contract = new Contract(account, contractId, {
      viewMethods: ["get_keys"],
      changeMethods: ["update_keys"],
      useLocalViewExecution: false,
    }) as unknown as OIDCAuthContractType;
  }

  async updateKeys(issuer: string, keys: PublicKey[]): Promise<void> {
    return await this.contract.update_keys({
      issuer,
      keys,
    });
  }

  async getKeys(): Promise<[string, PublicKey[]][]> {
    return await this.contract.get_keys();
  }
}
