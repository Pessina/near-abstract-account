mod mods;
mod types;

use mods::transaction::Transaction;
use near_sdk::{env, near, require, store::LookupMap, AccountId, Promise};
use types::UserOp;
#[near(contract_state)]
pub struct AbstractAccountContract {
    owner: AccountId,
    auth_keys: LookupMap<String, String>, // key_id -> auth_key (compressed public key, eth address, etc)
    auth_contracts: LookupMap<String, AccountId>,
    nonce: u64,
}

impl Default for AbstractAccountContract {
    fn default() -> Self {
        Self {
            auth_keys: LookupMap::new(b"c"),
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

    pub fn add_auth_key(&mut self, key_id: String, auth_key: String) {
        self.assert_owner();
        self.auth_keys.insert(key_id, auth_key);
    }

    pub fn get_auth_key(&self, key_id: String) -> Option<String> {
        self.auth_keys.get(&key_id).cloned()
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
    pub fn auth(&mut self, user_op: UserOp) -> Promise {
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
}
