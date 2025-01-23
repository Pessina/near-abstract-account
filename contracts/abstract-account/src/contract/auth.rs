use crate::mods::external_contracts::{
    ethereum_auth, oidc_auth, solana_auth, webauthn_auth, VALIDATE_ETH_SIGNATURE_GAS,
    VALIDATE_P256_SIGNATURE_GAS,
};
use crate::types::auth_identity::AuthIdentityNames;
use crate::*;
use interfaces::auth::{
    oidc::{OIDCAuthIdentity, OIDCCredentials, OIDCValidationData},
    wallet::{WalletCredentials, WalletValidationData},
    webauthn::{WebAuthnCredentials, WebAuthnValidationData},
};
use near_sdk::{env, require, Promise};

impl AbstractAccountContract {
    fn get_auth_contract(&self, auth_type: &AuthIdentityNames) -> AccountId {
        self.auth_contracts
            .get(auth_type)
            .expect(&format!("{:?} contract not configured", auth_type))
            .clone()
    }

    pub fn handle_oidc_auth(
        &self,
        credentials: OIDCCredentials,
        signed_message: String,
        oidc_auth_identity: OIDCAuthIdentity,
    ) -> Promise {
        let oidc_data = OIDCValidationData {
            message: signed_message,
            token: credentials.token,
        };

        let oidc_contract = self.get_auth_contract(&AuthIdentityNames::OIDC);

        oidc_auth::ext(oidc_contract)
            .with_static_gas(VALIDATE_ETH_SIGNATURE_GAS)
            .with_attached_deposit(env::attached_deposit())
            .verify(oidc_data, oidc_auth_identity)
    }

    pub fn handle_wallet_auth(
        &self,
        credentials: WalletCredentials,
        signed_message: String,
        compressed_public_key: String,
        wallet_type: AuthIdentityNames,
    ) -> Promise {
        let wallet_data = WalletValidationData {
            message: signed_message,
            signature: credentials.signature,
        };

        let contract = self.get_auth_contract(&wallet_type);

        match wallet_type {
            AuthIdentityNames::EthereumWallet => ethereum_auth::ext(contract)
                .with_static_gas(VALIDATE_ETH_SIGNATURE_GAS)
                .with_attached_deposit(env::attached_deposit())
                .verify(wallet_data, compressed_public_key),
            AuthIdentityNames::SolanaWallet => solana_auth::ext(contract)
                .with_static_gas(VALIDATE_ETH_SIGNATURE_GAS)
                .with_attached_deposit(env::attached_deposit())
                .verify(wallet_data, compressed_public_key),
            _ => env::panic_str("Invalid wallet type"),
        }
    }

    pub fn handle_webauthn_auth(
        &self,
        credentials: WebAuthnCredentials,
        signed_message: String,
        compressed_public_key: String,
    ) -> Promise {
        let client_data: serde_json::Value =
            serde_json::from_str(&credentials.client_data).expect("Invalid client data JSON");

        let client_challenge = client_data["challenge"]
            .as_str()
            .expect("Missing challenge in client data");

        require!(
            client_challenge == signed_message,
            format!(
                "Challenge mismatch - Expected: {}, Got: {}",
                client_challenge, signed_message
            )
        );

        let webauthn_data = WebAuthnValidationData {
            signature: credentials.signature,
            authenticator_data: credentials.authenticator_data,
            client_data: credentials.client_data,
        };

        let webauthn_contract = self.get_auth_contract(&AuthIdentityNames::WebAuthn);

        webauthn_auth::ext(webauthn_contract)
            .with_static_gas(VALIDATE_P256_SIGNATURE_GAS)
            .with_attached_deposit(env::attached_deposit())
            .verify_p256(webauthn_data, compressed_public_key)
    }
}
