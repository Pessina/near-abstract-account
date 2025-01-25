use near_sdk::env;
use near_sdk_contract_tools::nft::nep145::{Nep145, Nep145Controller};

use crate::*;

#[near]
impl AbstractAccountContract {
    pub fn add_account(&mut self, account_id: &str, auth_identity: AuthIdentity) {
        let storage_usage_start = env::storage_usage();
        let predecessor = env::predecessor_account_id();
        self.storage_balance_of(predecessor.clone())
            .unwrap_or_else(|| env::panic_str("Predecessor has not registered for storage"));

        if self.accounts.contains_key(account_id) {
            env::panic_str("Account already exists");
        }

        self.accounts.insert(
            account_id.to_string(),
            Account::new(vec![auth_identity], self.max_nonce),
        );
        self.accounts.flush();

        self.storage_accounting(&predecessor, storage_usage_start)
            .unwrap_or_else(|e| env::panic_str(&e.to_string()));
    }

    #[private]
    pub fn remove_account(&mut self, account_id: &str) {
        let account_nonce = self.accounts.get(account_id).unwrap().nonce;
        if account_nonce > self.max_nonce {
            self.max_nonce = account_nonce;
        }

        self.accounts.remove(account_id);
    }

    #[private]
    #[payable]
    pub fn add_auth_identity(
        &mut self,
        account_id: &str,
        auth_identity: AuthIdentity,
        #[callback_result] auth_result: Result<bool, near_sdk::PromiseError>,
    ) {
        match auth_result {
            Ok(true) => {
                self.accounts
                    .get_mut(account_id)
                    .unwrap()
                    .add_auth_identity(auth_identity);
            }
            Ok(false) => env::panic_str("Authentication failed"),
            _ => env::panic_str("Failed to add auth identity"),
        }
    }

    #[private]
    pub fn remove_auth_identity(&mut self, account_id: &str, auth_identity: &AuthIdentity) {
        let account = self.accounts.get_mut(account_id).unwrap();
        account.remove_auth_identity(auth_identity);

        if account.auth_identities.is_empty() {
            self.accounts.remove(account_id);
        }
    }

    pub fn get_account_by_id(&self, account_id: String) -> Option<&Account> {
        self.accounts.get(&account_id)
    }

    pub fn list_account_ids(&self) -> Vec<String> {
        self.accounts.iter().map(|(key, _)| key.clone()).collect()
    }

    pub fn list_auth_identities(&self, account_id: String) -> Option<Vec<AuthIdentity>> {
        self.accounts
            .get(&account_id)
            .map(|account| account.auth_identities.clone())
    }

    pub fn get_account_by_auth_identity(&self, auth_identity: AuthIdentity) -> Vec<String> {
        self.accounts
            .iter()
            .filter(|(_, account)| account.has_auth_identity(&auth_identity))
            .map(|(key, _)| key.clone())
            .collect()
    }

    #[private]
    pub fn handle_account_action(
        &mut self,
        predecessor: AccountId,
        account_id: String,
        action: Action,
    ) {
        let storage_usage_start = env::storage_usage();
        self.storage_balance_of(predecessor.clone())
            .expect("Predecessor has not registered for storage");

        let account = self.accounts.get(&account_id).unwrap();

        match action.clone() {
            Action::RemoveAccount => {
                self.remove_account(&account_id);
            }
            Action::AddAuthIdentityWithAuth(auth) => {
                // Decrement nonce since it was incremented on auth method
                let signed_message = action.to_signed_message((&account_id, account.nonce - 1));

                self.validate_credentials(
                    auth.auth_identity.authenticator.clone(),
                    auth.credentials,
                    signed_message,
                    &account,
                    Self::ext(env::current_account_id())
                        .add_auth_identity(&account_id, auth.auth_identity),
                );
            }
            Action::AddAuthIdentity(auth_identity) => {
                // If the auth identity doesn't have enable_act_as permission, we don't need its authorization
                // since it can only control the account but cannot be controlled by the account
                if let Some(ref permissions) = auth_identity.permissions {
                    if !permissions.enable_act_as {
                        self.add_auth_identity(&account_id, auth_identity, Ok(true));
                    } else {
                        env::panic_str("When enable_act_as permission is set, the auth_identity must authorize being added through AddAuthIdentityWithAuth");
                    }
                }
            }
            Action::RemoveAuthIdentity(remove_auth_identity) => {
                self.remove_auth_identity(&account_id, &remove_auth_identity);
            }
            _ => env::panic_str("Invalid account action"),
        }

        self.accounts.flush();

        self.storage_accounting(&predecessor, storage_usage_start)
            .expect("Storage accounting failed");
    }
}
