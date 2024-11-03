mod mods;
mod types;

use std::str::FromStr;

use crate::types::{Action, Transaction, UserOperation, WebAuthnAuth};
use base64::engine::{general_purpose::URL_SAFE_NO_PAD, Engine};
use interfaces::webauthn_auth::WebAuthnData;
use mods::external_contracts::VALIDATE_P256_SIGNATURE_GAS;
use near_sdk::{env, near, require, store::LookupMap, AccountId, Gas, NearToken, Promise};

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
            public_keys: LookupMap::new(b"c"),
            owner: env::predecessor_account_id(),
            auth_contracts: LookupMap::new(b"d"),
            nonce: 0,
        }
    }
}

#[near]
impl AbstractAccountContract {
    #[init(ignore_state)]
    pub fn new() -> Self {
        Self::default()
    }

    #[private]
    pub fn assert_owner(&self) {
        require!(
            env::predecessor_account_id() == self.owner,
            "Access denied: caller is not the owner"
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
        let parsed_nonce = user_op
            .transaction
            .nonce
            .parse::<u64>()
            .unwrap_or_else(|_| env::panic_str("Invalid nonce format"));

        require!(
            parsed_nonce == self.nonce,
            format!(
                "Nonce mismatch - Expected: {}, Got: {}",
                self.nonce, parsed_nonce
            )
        );

        self.nonce += 1;

        match user_op.auth.auth_type.as_str() {
            "webauthn" => match self.handle_webauthn_auth(user_op) {
                Ok(promise) => promise,
                Err(e) => env::panic_str(&e),
            },
            _ => env::panic_str("Unsupported auth type"),
        }
    }

    fn handle_webauthn_auth(&self, user_op: UserOperation) -> Result<Promise, String> {
        let webauthn_auth: WebAuthnAuth = serde_json::from_str(&user_op.auth.auth_data.to_string())
            .map_err(|_| "Invalid WebAuthn auth data")?;

        let compressed_public_key = self
            .get_public_key(webauthn_auth.public_key_id.clone())
            .ok_or("Public key not found")?;

        let client_data: serde_json::Value =
            serde_json::from_str(&webauthn_auth.webauthn_data.client_data)
                .map_err(|_| "Invalid client data JSON")?;

        let client_challenge = client_data["challenge"]
            .as_str()
            .ok_or("Missing challenge in client data")?;

        let canonical = serde_json_canonicalizer::to_string(&user_op.transaction)
            .map_err(|_| "Failed to canonicalize transaction")?;
        let transaction_hash = URL_SAFE_NO_PAD.encode(env::sha256(canonical.as_bytes()));

        require!(
            client_challenge == transaction_hash,
            format!(
                "Challenge mismatch - Expected: {}, Got: {}",
                transaction_hash, client_challenge
            )
        );

        let webauthn_data = WebAuthnData {
            signature: webauthn_auth.webauthn_data.signature,
            authenticator_data: webauthn_auth.webauthn_data.authenticator_data,
            client_data: webauthn_auth.webauthn_data.client_data,
        };

        let webauthn_contract = self
            .auth_contracts
            .get("webauthn")
            .ok_or("WebAuthn contract not configured")?;

        Ok(
            mods::external_contracts::webauthn_auth::ext(webauthn_contract.clone())
                .with_static_gas(VALIDATE_P256_SIGNATURE_GAS)
                .validate_p256_signature(webauthn_data, compressed_public_key)
                .then(Self::ext(env::current_account_id()).auth_callback(user_op.transaction)),
        )
    }

    #[private]
    pub fn auth_callback(
        &mut self,
        transaction: Transaction,
        #[callback_result] auth_result: Result<bool, near_sdk::PromiseError>,
    ) -> Promise {
        match auth_result {
            Ok(true) => match self.execute_transaction(transaction) {
                Ok(promise) => promise,
                Err(e) => env::panic_str(&e),
            },
            Ok(false) => env::panic_str("Authentication failed"),
            Err(_) => env::panic_str("Error validating authentication"),
        }
    }

    fn execute_transaction(&self, transaction: Transaction) -> Result<Promise, String> {
        let receiver_id = AccountId::from_str(&transaction.receiver_id)
            .map_err(|_| "Invalid receiver account ID")?;

        let mut promise = Promise::new(receiver_id);

        for action in transaction.actions {
            match action {
                Action::Transfer(transfer) => {
                    let amount = transfer
                        .deposit
                        .parse::<u128>()
                        .map_err(|_| "Invalid transfer amount")?;
                    promise = promise.transfer(NearToken::from_yoctonear(amount));
                }
                Action::FunctionCall(function_call) => {
                    let deposit = function_call
                        .deposit
                        .parse::<u128>()
                        .map_err(|_| "Invalid function call deposit")?;
                    let gas = function_call
                        .gas
                        .parse::<u64>()
                        .map_err(|_| "Invalid gas amount")?;
                    promise = promise.function_call(
                        function_call.method_name,
                        function_call.args.as_bytes().to_vec(),
                        NearToken::from_yoctonear(deposit),
                        Gas::from_gas(gas),
                    );
                }
            }
        }
        Ok(promise)
    }
}
