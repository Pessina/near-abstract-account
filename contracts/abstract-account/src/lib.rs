mod mods;
mod types;

use crate::types::{UserOperation, WebAuthnAuth};
use interfaces::webauthn_auth::{PublicKey, WebAuthnData};
use mods::external_contracts::VALIDATE_P256_SIGNATURE_GAS;
use near_sdk::store::LookupMap;
use near_sdk::{env, near};
use near_sdk::{AccountId, Gas, Promise};

const AUTH_CALLBACK_GAS: Gas = Gas::from_tgas(3);

#[near(contract_state)]
pub struct AbstractAccountContract {
    public_keys: LookupMap<String, bool>,
    owner: AccountId,
    auth_contracts: LookupMap<String, AccountId>,
}

impl Default for AbstractAccountContract {
    fn default() -> Self {
        Self {
            public_keys: LookupMap::new(b"p"),
            owner: env::predecessor_account_id(),
            auth_contracts: LookupMap::new(b"a"),
        }
    }
}

#[near]
impl AbstractAccountContract {
    #[init(ignore_state)]
    pub fn new(owner: AccountId) -> Self {
        Self {
            public_keys: LookupMap::new(b"p"),
            owner,
            auth_contracts: LookupMap::new(b"a"),
        }
    }

    #[private]
    pub fn assert_owner(&self) {
        assert_eq!(
            env::predecessor_account_id(),
            self.owner,
            "Only the owner can perform this action"
        );
    }

    pub fn add_public_key(&mut self, public_key: String) {
        self.assert_owner();
        self.public_keys.insert(public_key, true);
    }

    pub fn has_public_key(&self, public_key: String) -> bool {
        self.public_keys.contains_key(&public_key)
    }

    pub fn add_auth_contract(&mut self, auth_type: String, auth_contract_account_id: AccountId) {
        self.assert_owner();
        self.auth_contracts
            .insert(auth_type, auth_contract_account_id);
    }

    #[payable]
    pub fn auth(&mut self, user_op: UserOperation) -> Promise {
        match user_op.auth.auth_type.as_str() {
            "webauthn" => {
                let webauthn_auth: WebAuthnAuth =
                    serde_json::from_str(&user_op.auth.auth_data.to_string()).unwrap();

                if !self.public_keys.contains_key(&webauthn_auth.public_key) {
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

                let webauthn_contract = self
                    .auth_contracts
                    .get("webauthn")
                    .expect("WebAuthn contract not set");

                mods::external_contracts::webauthn_auth::ext(webauthn_contract.clone())
                    .with_static_gas(VALIDATE_P256_SIGNATURE_GAS)
                    .validate_p256_signature(webauthn_data, public_key)
                    .then(
                        Self::ext(env::current_account_id())
                            .with_static_gas(AUTH_CALLBACK_GAS)
                            .auth_callback(),
                    )
            }
            _ => near_sdk::env::panic_str("No supported auth method"),
        }
    }

    #[private]
    pub fn auth_callback(
        &self,
        #[callback_result] auth_result: Result<bool, near_sdk::PromiseError>,
    ) {
        match auth_result {
            Ok(result) => near_sdk::log!("Auth result: {}", result),
            Err(e) => near_sdk::log!("Auth failed with error: {:?}", e),
        }
    }

    #[private]
    pub fn on_auth_failed(&self) -> bool {
        false
    }
}
