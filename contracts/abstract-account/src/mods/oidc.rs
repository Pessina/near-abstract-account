use crate::mods::external_contracts::{oidc_auth, VALIDATE_ETH_SIGNATURE_GAS};
use crate::types::transaction::UserOp;
use crate::AbstractAccountContract;
use interfaces::oidc_auth::{OIDCData, OIDCAuthIdentity};
use near_sdk::{env, Promise};
use serde_json_canonicalizer;

impl AbstractAccountContract {
    pub fn handle_oidc_auth(&self, user_op: UserOp, oidc_auth_identity: OIDCAuthIdentity) -> Result<Promise, String> {
        let oidc_auth: OIDCData = serde_json::from_str(&user_op.auth.auth_data.to_string())
            .map_err(|_| "Invalid OIDC auth data")?;

        let message = serde_json_canonicalizer::to_string(&user_op.payloads)
            .map_err(|_| "Failed to canonicalize transaction")?;

        let oidc_data = OIDCData {
            message,
            token: oidc_auth.token,
        };

        let oidc_contract = self
            .auth_contracts
            .get("oidc")
            .ok_or("OIDC contract not configured")?;

        Ok(oidc_auth::ext(oidc_contract.clone())
            .with_static_gas(VALIDATE_ETH_SIGNATURE_GAS)
            .with_attached_deposit(env::attached_deposit())
            .validate_oidc_token(oidc_data, oidc_auth_identity))
    }
}
