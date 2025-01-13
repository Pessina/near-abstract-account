import { Contract, Account as NearAccount } from "near-api-js";
import { OIDCData } from "./AbstractAccountContract";
import { OIDCAuthIdentity } from "./types";

type OIDCAuthContractType = Contract & {
  new: () => Promise<void>;
  validate_oidc_token: (args: {
    oidc_data: OIDCData;
    oidc_auth_identity: OIDCAuthIdentity;
  }) => Promise<boolean>;
  update_google_key: (args: { kid: string; key: PublicKey }) => Promise<void>;
  update_facebook_key: (args: { kid: string; key: PublicKey }) => Promise<void>;
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
      viewMethods: ["validate_oidc_token"],
      changeMethods: ["new", "update_google_key", "update_facebook_key"],
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

  async updateGoogleKey(kid: string, key: PublicKey): Promise<void> {
    return await this.contract.update_google_key({
      kid,
      key,
    });
  }

  async updateFacebookKey(kid: string, key: PublicKey): Promise<void> {
    return await this.contract.update_facebook_key({
      kid,
      key,
    });
  }
}
