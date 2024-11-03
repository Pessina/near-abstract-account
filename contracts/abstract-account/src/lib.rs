mod mods;
mod types;

use std::str::FromStr;

use crate::types::{Action, Transaction, UserOperation, WebAuthnAuth};
use base64::engine::{general_purpose::URL_SAFE_NO_PAD, Engine};
use interfaces::webauthn_auth::WebAuthnData;
use mods::external_contracts::VALIDATE_P256_SIGNATURE_GAS;
use near_sdk::{env, log, near, store::LookupMap, AccountId, Gas, NearToken, Promise};
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
        if env::predecessor_account_id() != self.owner {
            log!(
                "Access denied: {} is not the owner",
                env::predecessor_account_id()
            );
            return;
        }
    }

    pub fn add_public_key(&mut self, key_id: String, compressed_public_key: String) {
        self.assert_owner();
        self.public_keys
            .insert(key_id.clone(), compressed_public_key.clone());
        log!(
            "Added public key: {} with compressed key: {}",
            key_id,
            compressed_public_key
        );
    }

    pub fn get_public_key(&self, key_id: String) -> Option<String> {
        let result = self.public_keys.get(&key_id).cloned();
        if result.is_none() {
            log!("Public key not found for key_id: {}", key_id);
        }
        result
    }

    pub fn set_auth_contract(&mut self, auth_type: String, auth_contract_account_id: AccountId) {
        self.assert_owner();
        self.auth_contracts
            .insert(auth_type.clone(), auth_contract_account_id.clone());
        log!(
            "Set auth contract: {} for type: {}",
            auth_contract_account_id,
            auth_type
        );
    }

    pub fn get_nonce(&self) -> u64 {
        self.nonce
    }

    #[payable]
    pub fn auth(&mut self, user_op: UserOperation) -> Promise {
        let parsed_nonce = match user_op.transaction.nonce.parse::<u64>() {
            Ok(n) => n,
            Err(e) => {
                log!("Failed to parse nonce: {}", e);
                return Promise::new(env::current_account_id());
            }
        };

        if parsed_nonce != self.nonce {
            log!(
                "Nonce mismatch - Expected: {}, Got: {}",
                self.nonce,
                parsed_nonce
            );
            return Promise::new(env::current_account_id());
        }

        self.nonce += 1;

        match user_op.auth.auth_type.as_str() {
            "webauthn" => {
                let webauthn_auth: WebAuthnAuth =
                    match serde_json::from_str(&user_op.auth.auth_data.to_string()) {
                        Ok(auth) => auth,
                        Err(e) => {
                            log!("Failed to parse WebAuthn auth data: {}", e);
                            return Promise::new(env::current_account_id());
                        }
                    };

                let compressed_public_key =
                    match self.get_public_key(webauthn_auth.public_key_id.clone()) {
                        Some(key) => key,
                        None => {
                            log!("Public key not found");
                            return Promise::new(env::current_account_id());
                        }
                    };

                let client_data: serde_json::Value =
                    match serde_json::from_str(&webauthn_auth.webauthn_data.client_data) {
                        Ok(data) => data,
                        Err(e) => {
                            log!("Failed to parse client data JSON: {}", e);
                            return Promise::new(env::current_account_id());
                        }
                    };

                let client_challenge = match client_data["challenge"].as_str() {
                    Some(challenge) => challenge,
                    None => {
                        log!("Missing challenge in client data");
                        return Promise::new(env::current_account_id());
                    }
                };

                let canonical = match canonicalize(&user_op.transaction) {
                    Ok(c) => c,
                    Err(e) => {
                        log!("Failed to canonicalize transaction: {}", e);
                        return Promise::new(env::current_account_id());
                    }
                };
                let transaction_hash = URL_SAFE_NO_PAD.encode(env::sha256(canonical.as_bytes()));

                if client_challenge != transaction_hash {
                    log!(
                        "Challenge mismatch - Expected: {}, Got: {}",
                        transaction_hash,
                        client_challenge
                    );
                    return Promise::new(env::current_account_id());
                }

                let webauthn_data = WebAuthnData {
                    signature: webauthn_auth.webauthn_data.signature,
                    authenticator_data: webauthn_auth.webauthn_data.authenticator_data,
                    client_data: webauthn_auth.webauthn_data.client_data,
                };

                let webauthn_contract = match self.auth_contracts.get("webauthn") {
                    Some(contract) => contract,
                    None => {
                        log!("WebAuthn contract not configured");
                        return Promise::new(env::current_account_id());
                    }
                };

                mods::external_contracts::webauthn_auth::ext(webauthn_contract.clone())
                    .with_static_gas(VALIDATE_P256_SIGNATURE_GAS)
                    .validate_p256_signature(webauthn_data, compressed_public_key)
                    .then(Self::ext(env::current_account_id()).auth_callback(user_op.transaction))
            }
            unsupported => {
                log!("Unsupported auth method: {}", unsupported);
                Promise::new(env::current_account_id())
            }
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
                let receiver_id = match AccountId::from_str(&transaction.receiver_id) {
                    Ok(id) => id,
                    Err(e) => {
                        log!("Invalid receiver account ID: {}", e);
                        return Promise::new(env::current_account_id());
                    }
                };

                let mut promise = Promise::new(receiver_id);

                for action in transaction.actions {
                    match action {
                        Action::Transfer(transfer) => {
                            let amount = match transfer.deposit.parse::<u128>() {
                                Ok(amount) => amount,
                                Err(e) => {
                                    log!("Invalid transfer amount: {}", e);
                                    return Promise::new(env::current_account_id());
                                }
                            };
                            promise = promise.transfer(NearToken::from_yoctonear(amount));
                        }
                        Action::FunctionCall(function_call) => {
                            let deposit = match function_call.deposit.parse::<u128>() {
                                Ok(amount) => amount,
                                Err(e) => {
                                    log!("Invalid function call deposit: {}", e);
                                    return Promise::new(env::current_account_id());
                                }
                            };
                            let gas = match function_call.gas.parse::<u64>() {
                                Ok(gas) => gas,
                                Err(e) => {
                                    log!("Invalid gas amount: {}", e);
                                    return Promise::new(env::current_account_id());
                                }
                            };
                            promise = promise.function_call(
                                function_call.method_name,
                                function_call.args.as_bytes().to_vec(),
                                NearToken::from_yoctonear(deposit),
                                Gas::from_gas(gas),
                            );
                        }
                    }
                }
                promise
            }
            Ok(false) => {
                log!("Authentication validation failed");
                Promise::new(env::current_account_id())
            }
            Err(e) => {
                log!("Error during authentication callback: {:?}", e);
                Promise::new(env::current_account_id())
            }
        }
    }

    #[private]
    pub fn on_auth_failed(&self) -> bool {
        log!("Authentication failed callback executed");
        false
    }
}
