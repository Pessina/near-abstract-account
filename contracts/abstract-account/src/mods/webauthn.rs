use crate::mods::external_contracts::{webauthn_auth, VALIDATE_P256_SIGNATURE_GAS};
use crate::types::transaction::UserOp;
use crate::AbstractAccountContract;
use base64::engine::{general_purpose::URL_SAFE_NO_PAD, Engine};
use interfaces::webauthn_auth::WebAuthnData;
use near_sdk::{env, require, Promise};

impl AbstractAccountContract {
    pub fn handle_webauthn_auth(&self, user_op: UserOp, compressed_public_key: String) -> Result<Promise, String> {
        let webauthn_auth: WebAuthnData = serde_json::from_str(&user_op.auth.auth_data.to_string())
            .map_err(|_| "Invalid WebAuthn auth data")?;

        let client_data: serde_json::Value = serde_json::from_str(&webauthn_auth.client_data)
            .map_err(|_| "Invalid client data JSON")?;

        let client_challenge = client_data["challenge"]
            .as_str()
            .ok_or("Missing challenge in client data")?;

        let canonical = serde_json_canonicalizer::to_string(&user_op.payloads)
            .map_err(|_| "Failed to canonicalize transaction")?;
        let transaction_hash = URL_SAFE_NO_PAD.encode(env::sha256(canonical.as_bytes()));

        require!(
            client_challenge == transaction_hash,
            format!(
                "Challenge mismatch - Expected: {}, Got: {}",
                transaction_hash, client_challenge
            )
        );

        let webauthn_data = WebAuthnData {
            signature: webauthn_auth.signature,
            authenticator_data: webauthn_auth.authenticator_data,
            client_data: webauthn_auth.client_data,
        };

        let webauthn_contract = self
            .auth_contracts
            .get("webauthn")
            .ok_or("WebAuthn contract not configured")?;

        Ok(webauthn_auth::ext(webauthn_contract.clone())
            .with_static_gas(VALIDATE_P256_SIGNATURE_GAS)
            .validate_p256_signature(webauthn_data, compressed_public_key))
    }
}
