import { Contract, Account as NearAccount } from "near-api-js";
import { OIDCData } from "./AbstractAccountContract";
import { OIDCAuthIdentity } from "./types";

type OIDCAuthContractType = Contract & {
  new: () => Promise<void>;
  validate_oidc_token: (args: {
    oidc_data: OIDCData;
    oidc_auth_identity: OIDCAuthIdentity;
  }) => Promise<boolean>;
  update_keys: (args: { issuer: string; keys: PublicKey[] }) => Promise<void>;
  get_keys: (args: { issuer: string }) => Promise<PublicKey[]>;
};

interface PublicKey {
  kid: string;
  n: string;
  e: string;
  alg: string;
  kty: string;
  use: string;
}

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
      viewMethods: ["validate_oidc_token", "get_keys"],
      changeMethods: ["new", "update_keys"],
      useLocalViewExecution: false,
    }) as unknown as OIDCAuthContractType;
  }

  async new(): Promise<void> {
    return await this.contract.new();
  }

  async validateOIDCToken(
    oidcData: OIDCData,
    oidcAuthIdentity: OIDCAuthIdentity
  ): Promise<boolean> {
    return await this.contract.validate_oidc_token({
      oidc_data: oidcData,
      oidc_auth_identity: oidcAuthIdentity,
    });
  }

  async updateKeys(issuer: string, keys: PublicKey[]): Promise<void> {
    if (keys.length !== 2) {
      throw new Error("Invalid number of keys");
    }

    return await this.contract.update_keys({
      issuer,
      keys,
    });
  }

  async getKeys(issuer: string): Promise<PublicKey[]> {
    return await this.contract.get_keys({
      issuer,
    });
  }
}
