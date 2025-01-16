use crate::mods::external_contracts::{oidc_auth, VALIDATE_ETH_SIGNATURE_GAS};
use crate::types::auth_identity::AuthIdentityNames;
use crate::types::transaction::UserOp;
use crate::AbstractAccountContract;
use interfaces::auth::oidc::{OIDCAuthIdentity, OIDCCredentials, OIDCValidationData};
use near_sdk::{env, Promise};
use serde_json_canonicalizer;

impl AbstractAccountContract {
    pub fn handle_oidc_auth(
        &self,
        user_op: UserOp,
        oidc_auth_identity: OIDCAuthIdentity,
    ) -> Result<Promise, String> {
        let oidc_auth: OIDCCredentials =
            serde_json::from_str(&user_op.auth.credentials.to_string())
                .map_err(|_| "Invalid OIDC auth data")?;

        let message = serde_json_canonicalizer::to_string(&user_op.payloads)
            .map_err(|_| "Failed to canonicalize transaction")?;

        let oidc_data = OIDCValidationData {
            message,
            token: oidc_auth.token,
        };

        let oidc_contract = self
            .auth_contracts
            .get(&AuthIdentityNames::OIDC)
            .ok_or("OIDC contract not configured")?;

        Ok(oidc_auth::ext(oidc_contract.clone())
            .with_static_gas(VALIDATE_ETH_SIGNATURE_GAS)
            .with_attached_deposit(env::attached_deposit())
            .verify(oidc_data, oidc_auth_identity))
    }
}
