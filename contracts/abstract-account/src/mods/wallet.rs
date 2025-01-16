use crate::mods::external_contracts::{ethereum_auth, solana_auth, VALIDATE_ETH_SIGNATURE_GAS};
use crate::types::auth_identity::AuthIdentityNames;
use crate::types::transaction::UserOp;
use crate::AbstractAccountContract;
use interfaces::auth::wallet::{WalletCredentials, WalletValidationData};
use near_sdk::{env, Promise};
use serde_json_canonicalizer;

impl AbstractAccountContract {
    pub fn handle_wallet_auth(
        &self,
        user_op: UserOp,
        compressed_public_key: String,
        wallet_type: AuthIdentityNames,
    ) -> Result<Promise, String> {
        let wallet_auth: WalletCredentials =
            serde_json::from_str(&user_op.auth.credentials.to_string())
                .map_err(|_| "Invalid wallet auth data")?;

        let message = serde_json_canonicalizer::to_string(&user_op.payloads)
            .map_err(|_| "Failed to canonicalize transaction")?;

        let wallet_data = WalletValidationData {
            message,
            signature: wallet_auth.signature,
        };

        match wallet_type {
            AuthIdentityNames::EthereumWallet => {
                let ethereum_contract = self
                    .auth_contracts
                    .get(&wallet_type)
                    .ok_or("Ethereum contract not configured")?;

                Ok(ethereum_auth::ext(ethereum_contract.clone())
                    .with_static_gas(VALIDATE_ETH_SIGNATURE_GAS)
                    .with_attached_deposit(env::attached_deposit())
                    .verify(wallet_data, compressed_public_key))
            }
            AuthIdentityNames::SolanaWallet => {
                let solana_contract = self
                    .auth_contracts
                    .get(&wallet_type)
                    .ok_or("solana contract not configured")?;

                Ok(solana_auth::ext(solana_contract.clone())
                    .with_static_gas(VALIDATE_ETH_SIGNATURE_GAS)
                    .with_attached_deposit(env::attached_deposit())
                    .verify(wallet_data, compressed_public_key))
            }
            _ => Err("Invalid wallet type".to_string()),
        }
    }
}
