use crate::mods::external_contracts::{solana_auth, VALIDATE_ETH_SIGNATURE_GAS};
use crate::types::UserOp;
use crate::AbstractAccountContract;
use base64::engine::{general_purpose::URL_SAFE_NO_PAD, Engine};
use interfaces::solana_auth::SolanaData;
use near_sdk::{env, require, Promise};

impl AbstractAccountContract {
    pub fn handle_solana_auth(&self, user_op: UserOp) -> Result<Promise, String> {
        let solana_auth: SolanaData = serde_json::from_str(&user_op.auth.auth_data.to_string())
            .map_err(|_| "Invalid Solana auth data")?;

        let auth_key = self
            .get_auth_key(user_op.auth.auth_key_id.clone())
            .ok_or("Auth key not found")?;

        let canonical = serde_json_canonicalizer::to_string(&user_op.transaction)
            .map_err(|_| "Failed to canonicalize transaction")?;

        let message = URL_SAFE_NO_PAD.encode(env::sha256(canonical.as_bytes()));

        require!(
            solana_auth.message == message,
            format!(
                "Message mismatch - Expected: {}, Got: {}",
                message, solana_auth.message
            )
        );

        let solana_data = SolanaData {
            message: solana_auth.message,
            signature: solana_auth.signature,
        };

        let solana_contract = self
            .auth_contracts
            .get("solana")
            .ok_or("Solana contract not configured")?;

        Ok(solana_auth::ext(solana_contract.clone())
            .with_static_gas(VALIDATE_ETH_SIGNATURE_GAS)
            .validate_solana_signature(solana_data, auth_key)
            .then(Self::ext(env::current_account_id()).auth_callback(user_op.transaction)))
    }
}
