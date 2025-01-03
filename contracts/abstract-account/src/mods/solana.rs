use crate::mods::external_contracts::{solana_auth, VALIDATE_ETH_SIGNATURE_GAS};
use crate::types::UserOp;
use crate::AbstractAccountContract;
use interfaces::solana_auth::SolanaData;
use near_sdk::{env, Promise};

impl AbstractAccountContract {
    pub fn handle_solana_auth(&self, user_op: UserOp) -> Result<Promise, String> {
        let solana_auth: SolanaData = serde_json::from_str(&user_op.auth.auth_data.to_string())
            .map_err(|_| "Invalid Solana auth data")?;

        let auth_key = self
            .get_auth_key(user_op.auth.auth_key_id.clone())
            .ok_or("Auth key not found")?;

        let message = serde_json_canonicalizer::to_string(&user_op.transaction)
            .map_err(|_| "Failed to canonicalize transaction")?;

        let solana_data = SolanaData {
            message,
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
