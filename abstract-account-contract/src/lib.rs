mod mods;
mod types;

use crate::types::{UserOperation, WebAuthnAuth};
use mods::external_contracts::{PublicKey, WebAuthnData};
use near_sdk::near;
use near_sdk::store::LookupSet;
use near_sdk::{AccountId, Gas, Promise};

#[near(contract_state)]
pub struct AbstractAccountContract {
    public_keys: LookupSet<String>,
}

impl Default for AbstractAccountContract {
    fn default() -> Self {
        Self {
            public_keys: LookupSet::new(b"p"),
        }
    }
}

#[near]
impl AbstractAccountContract {
    #[init]
    pub fn new() -> Self {
        Self {
            public_keys: LookupSet::new(b"p"),
        }
    }

    pub fn add_public_key(&mut self, public_key: String) {
        self.public_keys.insert(public_key);
    }

    pub fn has_public_key(&self, public_key: String) -> bool {
        self.public_keys.contains(&public_key)
    }

    #[payable]
    pub fn auth(&mut self, user_op: UserOperation) -> Promise {
        match user_op.auth.auth_type.as_str() {
            "webauthn" => {
                let webauthn_auth: WebAuthnAuth =
                    serde_json::from_str(&user_op.auth.auth_data.to_string()).unwrap();

                if !self.public_keys.contains(&webauthn_auth.public_key) {
                    near_sdk::env::panic_str("Public key not found");
                }

                let public_key = PublicKey {
                    x: webauthn_auth.public_key[..64].to_string(),
                    y: webauthn_auth.public_key[64..].to_string(),
                };

                let webauthn_data = WebAuthnData {
                    signature: webauthn_auth.webauthn_data.signature,
                    authenticator_data: webauthn_auth.webauthn_data.authenticator_data,
                    client_data: webauthn_auth.webauthn_data.client_data,
                };

                mods::external_contracts::webauthn_auth::ext(AccountId::new_unchecked(
                    "webauthn-auth.near".to_string(),
                ))
                .with_static_gas(Gas::from_tgas(5))
                .validate_p256_signature(webauthn_data, public_key)
            }
            _ => Promise::new(env::current_account_id()).then(
                Self::ext(env::current_account_id())
                    .with_static_gas(Gas::from_tgas(5))
                    .on_auth_failed(),
            ),
        }
    }

    #[private]
    pub fn on_auth_failed(&self) -> bool {
        false
    }
}
