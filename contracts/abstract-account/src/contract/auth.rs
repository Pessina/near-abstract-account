use crate::mods::external_contracts::{
    ethereum_auth, oidc_auth, solana_auth, webauthn_auth, VALIDATE_ETH_SIGNATURE_GAS,
    VALIDATE_P256_SIGNATURE_GAS,
};
use crate::types::{auth_identity::AuthIdentityNames, transaction::UserOp};
use crate::*;
use base64::engine::{general_purpose::URL_SAFE_NO_PAD, Engine};
use interfaces::auth::{
    oidc::{OIDCAuthIdentity, OIDCCredentials, OIDCValidationData},
    wallet::{WalletCredentials, WalletValidationData},
    webauthn::{WebAuthnCredentials, WebAuthnValidationData},
};
use near_sdk::{env, log, require, Promise};
use serde_json_canonicalizer;

impl AbstractAccountContract {
    fn get_message_to_sign(user_op: &UserOp) -> Result<String, String> {
        serde_json_canonicalizer::to_string(&user_op.transaction)
            .map_err(|_| "Failed to canonicalize transaction".to_string())
    }

    fn get_auth_contract(&self, auth_type: &AuthIdentityNames) -> Result<AccountId, String> {
        self.auth_contracts
            .get(auth_type)
            .ok_or_else(|| format!("{:?} contract not configured", auth_type))
            .map(|contract| contract.clone())
    }

    pub fn handle_oidc_auth(
        &self,
        user_op: UserOp,
        oidc_auth_identity: OIDCAuthIdentity,
    ) -> Result<Promise, String> {
        let oidc_auth: OIDCCredentials =
            serde_json::from_str(&user_op.auth.credentials.to_string())
                .map_err(|_| "Invalid OIDC auth data")?;

        let message = Self::get_message_to_sign(&user_op)?;

        let oidc_data = OIDCValidationData {
            message,
            token: oidc_auth.token,
        };

        let oidc_contract = self.get_auth_contract(&AuthIdentityNames::OIDC)?;

        Ok(oidc_auth::ext(oidc_contract)
            .with_static_gas(VALIDATE_ETH_SIGNATURE_GAS)
            .with_attached_deposit(env::attached_deposit())
            .verify(oidc_data, oidc_auth_identity))
    }

    pub fn handle_wallet_auth(
        &self,
        user_op: UserOp,
        compressed_public_key: String,
        wallet_type: AuthIdentityNames,
    ) -> Result<Promise, String> {
        let wallet_auth: WalletCredentials =
            serde_json::from_str(&user_op.auth.credentials.to_string())
                .map_err(|_| "Invalid wallet auth data")?;

        let message = Self::get_message_to_sign(&user_op)?;

        let wallet_data = WalletValidationData {
            message,
            signature: wallet_auth.signature,
        };

        let contract = self.get_auth_contract(&wallet_type)?;

        match wallet_type {
            AuthIdentityNames::EthereumWallet => Ok(ethereum_auth::ext(contract)
                .with_static_gas(VALIDATE_ETH_SIGNATURE_GAS)
                .with_attached_deposit(env::attached_deposit())
                .verify(wallet_data, compressed_public_key)),
            AuthIdentityNames::SolanaWallet => Ok(solana_auth::ext(contract)
                .with_static_gas(VALIDATE_ETH_SIGNATURE_GAS)
                .with_attached_deposit(env::attached_deposit())
                .verify(wallet_data, compressed_public_key)),
            _ => Err("Invalid wallet type".to_string()),
        }
    }

    pub fn handle_webauthn_auth(
        &self,
        user_op: UserOp,
        compressed_public_key: String,
    ) -> Result<Promise, String> {
        let webauthn_auth: WebAuthnCredentials =
            serde_json::from_str(&user_op.auth.credentials.to_string())
                .map_err(|_| "Invalid WebAuthn auth data")?;

        let client_data: serde_json::Value = serde_json::from_str(&webauthn_auth.client_data)
            .map_err(|_| "Invalid client data JSON")?;

        let client_challenge = client_data["challenge"]
            .as_str()
            .ok_or("Missing challenge in client data")?;

        let message = Self::get_message_to_sign(&user_op)?;
        let transaction_hash = URL_SAFE_NO_PAD.encode(env::sha256(message.as_bytes()));

        require!(
            client_challenge == transaction_hash,
            format!(
                "Challenge mismatch - Expected: {}, Got: {}",
                transaction_hash, client_challenge
            )
        );

        let webauthn_data = WebAuthnValidationData {
            signature: webauthn_auth.signature,
            authenticator_data: webauthn_auth.authenticator_data,
            client_data: webauthn_auth.client_data,
        };

        let webauthn_contract = self.get_auth_contract(&AuthIdentityNames::WebAuthn)?;

        Ok(webauthn_auth::ext(webauthn_contract)
            .with_static_gas(VALIDATE_P256_SIGNATURE_GAS)
            .with_attached_deposit(env::attached_deposit())
            .verify_p256(webauthn_data, compressed_public_key))
    }
}
