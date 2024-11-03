mod mods;
mod types;

use std::str::FromStr;

use crate::types::{Action, Transaction, UserOperation, WebAuthnAuth};
use base64::engine::{general_purpose::URL_SAFE_NO_PAD, Engine};
use interfaces::webauthn_auth::WebAuthnData;
use mods::external_contracts::VALIDATE_P256_SIGNATURE_GAS;
use near_sdk::{env, near, store::LookupMap, AccountId, Gas, NearToken, Promise};
use serde_json_canonicalizer::to_string as canonicalize;

#[near(contract_state)]
pub struct AbstractAccountContract {
    owner: AccountId,
    public_keys: LookupMap<String, String>, // key_id -> compressed_public_key
    auth_contracts: LookupMap<String, AccountId>,
    nonce: u64,
}

impl Default for AbstractAccountContract {
    fn default() -> Self {
        Self {
            public_keys: LookupMap::new(b"p"),
            owner: env::predecessor_account_id(),
            auth_contracts: LookupMap::new(b"a"),
            nonce: 0,
        }
    }
}

#[near]
impl AbstractAccountContract {
    #[init(ignore_state)]
    pub fn new() -> Self {
        Self {
            public_keys: LookupMap::new(b"p"),
            owner: env::predecessor_account_id(),
            auth_contracts: LookupMap::new(b"a"),
            nonce: 0,
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

    pub fn add_public_key(&mut self, key_id: String, compressed_public_key: String) {
        self.assert_owner();
        self.public_keys.insert(key_id, compressed_public_key);
    }

    pub fn get_public_key(&self, key_id: String) -> Option<String> {
        self.public_keys.get(&key_id).cloned()
    }

    pub fn set_auth_contract(&mut self, auth_type: String, auth_contract_account_id: AccountId) {
        self.assert_owner();
        self.auth_contracts
            .insert(auth_type, auth_contract_account_id);
    }

    pub fn get_nonce(&self) -> u64 {
        self.nonce
    }

    #[payable]
    pub fn auth(&mut self, user_op: UserOperation) -> Promise {
        // Validate nonce matches current contract nonce
        assert_eq!(
            user_op.transaction.nonce.parse::<u64>().unwrap(),
            self.nonce,
            "Invalid nonce"
        );

        match user_op.auth.auth_type.as_str() {
            "webauthn" => {
                let webauthn_auth: WebAuthnAuth =
                    serde_json::from_str(&user_op.auth.auth_data.to_string()).unwrap();

                let compressed_public_key = self
                    .get_public_key(webauthn_auth.public_key_id)
                    .expect("Public key not found");

                let client_data: serde_json::Value =
                    serde_json::from_str(&webauthn_auth.webauthn_data.client_data)
                        .expect("Invalid client data JSON");
                let client_challenge = client_data["challenge"]
                    .as_str()
                    .expect("Missing challenge in client data");

                let canonical =
                    canonicalize(&user_op.transaction).expect("Failed to canonicalize transaction");
                let transaction_hash = URL_SAFE_NO_PAD.encode(env::sha256(canonical.as_bytes()));

                assert_eq!(
                    client_challenge, transaction_hash,
                    "Challenge does not match transaction hash"
                );

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
                    .validate_p256_signature(webauthn_data, compressed_public_key)
                    .then(Self::ext(env::current_account_id()).auth_callback(user_op.transaction))
            }
            _ => near_sdk::env::panic_str("No supported auth method"),
        }
    }

    #[private]
    pub fn auth_callback(
        &mut self,
        transaction: Transaction,
        #[callback_result] auth_result: Result<bool, near_sdk::PromiseError>,
    ) -> Promise {
        match auth_result {
            Ok(true) => {
                self.nonce += 1;

                let mut promise = Promise::new(
                    AccountId::from_str(&transaction.receiver_id).expect("Invalid AccountId"),
                );

                for action in transaction.actions {
                    match action {
                        Action::Transfer(transfer) => {
                            promise = promise.transfer(NearToken::from_yoctonear(
                                transfer.deposit.parse::<u128>().unwrap(),
                            ));
                        }
                        Action::FunctionCall(function_call) => {
                            promise = promise.function_call(
                                function_call.method_name,
                                function_call.args.as_bytes().to_vec(),
                                NearToken::from_yoctonear(
                                    function_call.deposit.parse::<u128>().unwrap(),
                                ),
                                Gas::from_gas(function_call.gas.parse::<u64>().unwrap()),
                            );
                        }
                    }
                }
                promise
            }
            Ok(false) => near_sdk::env::panic_str("Authentication failed"),
            Err(_) => near_sdk::env::panic_str("Error during authentication"),
        }
    }

    #[private]
    pub fn on_auth_failed(&self) -> bool {
        false
    }
}
