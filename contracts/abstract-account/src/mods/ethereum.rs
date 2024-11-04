use crate::mods::external_contracts::{ethereum_auth, VALIDATE_ETH_SIGNATURE_GAS};
use crate::types::UserOp;
use crate::AbstractAccountContract;
use interfaces::ethereum_auth::EthereumData;
use near_sdk::{env, Promise};
use serde_json_canonicalizer;

impl AbstractAccountContract {
    pub fn handle_ethereum_auth(&self, user_op: UserOp) -> Result<Promise, String> {
        let ethereum_auth: EthereumData = serde_json::from_str(&user_op.auth.auth_data.to_string())
            .map_err(|_| "Invalid Ethereum auth data")?;

        let eth_address = self
            .get_auth_key(user_op.auth.auth_key_id.clone())
            .ok_or("Auth key not found")?;

        let message = serde_json_canonicalizer::to_string(&user_op.transaction)
            .map_err(|_| "Failed to canonicalize transaction")?;

        let ethereum_data = EthereumData {
            message,
            signature: ethereum_auth.signature,
        };

        let ethereum_contract = self
            .auth_contracts
            .get("ethereum")
            .ok_or("Ethereum contract not configured")?;

        Ok(ethereum_auth::ext(ethereum_contract.clone())
            .with_static_gas(VALIDATE_ETH_SIGNATURE_GAS)
            .validate_eth_signature(ethereum_data, eth_address)
            .then(Self::ext(env::current_account_id()).auth_callback(user_op.transaction)))
    }
}
