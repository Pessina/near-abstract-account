mod mods;
mod types;

use mods::transaction::Transaction;
use near_sdk::{env, near, require, store::LookupMap, AccountId, Promise};
use types::{Account, AuthIdentity, UserOp, WalletType};

#[near(contract_state)]
pub struct AbstractAccountContract {
    owner: AccountId,
    accounts: LookupMap<String, Account>, // account_id -> account (nonce, auth_identities)
    auth_contracts: LookupMap<String, AccountId>,
}

impl Default for AbstractAccountContract {
    fn default() -> Self {
        Self {
            accounts: LookupMap::new(b"g"),
            owner: env::predecessor_account_id(),
            auth_contracts: LookupMap::new(b"h")
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

    pub fn add_account(&mut self, account_id: String, auth_identity: AuthIdentity) {
        // TODO: validate auth_identity is valid
        self.accounts.insert(account_id, Account::new(vec![auth_identity]));
    }

    pub fn get_account_by_id(&self, account_id: String) -> Option<&Account> {
        self.accounts.get(&account_id)
    }

    // TODO: get_account_by_auth_identity
    
    pub fn set_auth_contract(&mut self, auth_type: String, auth_contract_account_id: AccountId) {
        self.assert_owner();
        self.auth_contracts
            .insert(auth_type, auth_contract_account_id);
    }

    #[payable]
    pub fn auth(&mut self, user_op: UserOp) -> Promise {
        let parsed_nonce = user_op
            .transaction
            .nonce
            .parse::<u128>()
            .unwrap_or_else(|_| env::panic_str("Invalid nonce format"));
    
        let account = self.accounts.get_mut(&user_op.account_id).unwrap();
                
        require!(
            parsed_nonce == account.nonce,
            format!(
                "Nonce mismatch - Expected: {}, Got: {}",
                account.nonce, parsed_nonce
            )
        );

        require!(
            account.has_auth_identity(&user_op.auth.auth_identity),
            "Auth identity not found"
        );

        account.nonce += 1;

        let auth_identity = user_op.auth.auth_identity.clone();
        match auth_identity {
            AuthIdentity::WebAuthn(ref webauthn) => {
                let account = self.accounts.get(&user_op.account_id).unwrap();
                let webauthn_identity = account.auth_identities.iter()
                    .find(|identity| matches!(identity, AuthIdentity::WebAuthn(current_webauthn) if current_webauthn.key_id == webauthn.key_id))
                    .and_then(|identity| {
                        if let AuthIdentity::WebAuthn(webauthn) = identity {
                            Some(webauthn)
                        } else {
                            None
                        }
                    })
                    .expect("WebAuthn identity not found");

                let compressed_public_key = webauthn_identity.compressed_public_key
                    .as_ref()
                    .expect("WebAuthn public key not found");

                match self.handle_webauthn_auth(user_op, compressed_public_key.to_string()) {
                    Ok(promise) => promise,
                    Err(e) => env::panic_str(&e),
            }},
            AuthIdentity::Wallet(wallet) => match wallet.wallet_type {
                WalletType::Ethereum => match self.handle_ethereum_auth(user_op, wallet.public_key.clone()) {
                    Ok(promise) => promise,
                    Err(e) => env::panic_str(&e),
                },
                WalletType::Solana => match self.handle_solana_auth(user_op, wallet.public_key.clone()) {
                    Ok(promise) => promise,
                    Err(e) => env::panic_str(&e),
                },
            },
            AuthIdentity::OIDC(_) => env::panic_str("OIDC auth type not yet implemented"),
            AuthIdentity::Account(_) => env::panic_str("Account auth type not yet supported"),
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
