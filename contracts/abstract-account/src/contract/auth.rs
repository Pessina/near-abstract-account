use crate::mods::external_contracts::{
    ethereum_auth, oidc_auth, solana_auth, webauthn_auth, VALIDATE_ETH_SIGNATURE_GAS,
    VALIDATE_P256_SIGNATURE_GAS,
};
use crate::types::auth_identity::{AuthTypeNames, Identity};
use crate::*;
use base64::engine::{general_purpose::URL_SAFE_NO_PAD, Engine};
use interfaces::auth::{
    oidc::{OIDCAuthenticator, OIDCCredentials, OIDCValidationData},
    wallet::{WalletCredentials, WalletValidationData},
    webauthn::{WebAuthnCredentials, WebAuthnValidationData},
};
use near_sdk::{env, require, Promise};
use serde_json::Value;
use utils::utils::parse_credentials;
impl AbstractAccountContract {
    fn get_auth_contract(&self, name: &AuthTypeNames) -> AccountId {
        self.auth_contracts
            .get(name)
            .expect(&format!("{:?} contract not configured", name))
            .clone()
    }

    pub fn handle_oidc_auth(
        &self,
        credentials: OIDCCredentials,
        signed_message: String,
        oidc_authenticator: OIDCAuthenticator,
    ) -> Promise {
        let oidc_data = OIDCValidationData {
            message: signed_message,
            token: credentials.token,
        };

        let oidc_contract = self.get_auth_contract(&AuthTypeNames::OIDC);

        oidc_auth::ext(oidc_contract)
            .with_static_gas(VALIDATE_ETH_SIGNATURE_GAS)
            .with_attached_deposit(env::attached_deposit())
            .verify(oidc_data, oidc_authenticator)
    }

    pub fn handle_wallet_auth(
        &self,
        credentials: WalletCredentials,
        signed_message: String,
        compressed_public_key: String,
        wallet_type: AuthTypeNames,
    ) -> Promise {
        let wallet_data = WalletValidationData {
            message: signed_message,
            signature: credentials.signature,
        };

        let contract = self.get_auth_contract(&wallet_type);

        match wallet_type {
            AuthTypeNames::EthereumWallet => ethereum_auth::ext(contract)
                .with_static_gas(VALIDATE_ETH_SIGNATURE_GAS)
                .with_attached_deposit(env::attached_deposit())
                .verify(wallet_data, compressed_public_key),
            AuthTypeNames::SolanaWallet => solana_auth::ext(contract)
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
        // TODO: Remove hashing later
        let signed_message = URL_SAFE_NO_PAD.encode(env::sha256(signed_message.as_bytes()));

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

        let webauthn_contract = self.get_auth_contract(&AuthTypeNames::WebAuthn);

        webauthn_auth::ext(webauthn_contract)
            .with_static_gas(VALIDATE_P256_SIGNATURE_GAS)
            .with_attached_deposit(env::attached_deposit())
            .verify_p256(webauthn_data, compressed_public_key)
    }

    /// Handles credentials validation against the provided Identity and signed message authorizing executions
    ///
    /// # Arguments
    /// * `identity` - The authentication method being used
    /// * `credentials` - The credentials provided for authentication
    /// * `signed_message` - The message that was signed authorizing the execution
    /// * `account` - The account being authenticated against
    /// * `authenticate_callback` - Promise to execute if authentication succeeds
    ///
    /// # Returns
    /// A Promise that resolves to a boolean indicating whether the authentication was successful
    pub fn validate_credentials(
        &self,
        identity: Identity,
        credentials: Value,
        signed_message: String,
        authenticate_callback: Promise,
    ) -> Promise {
        let promise = match identity {
            Identity::WebAuthn(webauthn) => {
                let credentials = parse_credentials(&credentials);
                if let Some(compressed_public_key) = webauthn.compressed_public_key {
                    self.handle_webauthn_auth(
                        credentials,
                        signed_message,
                        compressed_public_key.to_string(),
                    )
                } else {
                    env::panic_str(
                        "WebAuthn compressed public key not found, please call inject_webauthn_compressed_public_key first",
                    );
                }
            }
            Identity::Wallet(wallet) => {
                let wallet_type = match wallet.wallet_type {
                    WalletType::Ethereum => AuthTypeNames::EthereumWallet,
                    WalletType::Solana => AuthTypeNames::SolanaWallet,
                };

                let credentials = parse_credentials(&credentials);

                self.handle_wallet_auth(
                    credentials,
                    signed_message,
                    wallet.public_key.clone(),
                    wallet_type,
                )
            }
            Identity::OIDC(oidc) => {
                let credentials = parse_credentials(&credentials);

                self.handle_oidc_auth(credentials, signed_message, oidc)
            }
            Identity::Account(_) => env::panic_str("Account auth type not yet supported"),
        };

        promise.then(authenticate_callback)
    }

    /// Validates that the user operation has valid permissions and account details
    ///
    /// # Arguments
    /// * `user_op` - The user operation to validate
    ///
    /// # Panics
    /// * If the auth identity is not found in the account
    /// * If the nonce doesn't match the account nonce
    /// * If acting as another identity without proper permissions
    pub fn validate_permission_and_account(&self, user_op: &UserOp) {
        let account = self.accounts.get(&user_op.transaction.account_id).unwrap();

        require!(
            account.get_identity(&user_op.auth.identity).is_some(),
            "Auth identity not found in account"
        );

        require!(account.nonce == user_op.transaction.nonce, "Nonce mismatch");

        if let Some(ref act_as) = user_op.act_as {
            let auth_identity = account
                .get_identity(act_as)
                .expect("act_as Identity not found on account");

            if let Some(ref permissions) = auth_identity.permissions {
                if !permissions.enable_act_as {
                    env::panic_str("Auth identity does not have enable_act_as permission");
                }
            }
        }
    }
}
