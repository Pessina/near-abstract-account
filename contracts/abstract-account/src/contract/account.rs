use near_sdk::env;
use near_sdk_contract_tools::nft::nep145::{Nep145, Nep145Controller};

use crate::*;

#[near]
impl AbstractAccountContract {
    pub fn add_account(&mut self, account_id: String, identity: IdentityWithPermissions) {
        let storage_usage_start = env::storage_usage();
        let predecessor = env::predecessor_account_id();
        self.storage_balance_of(predecessor.clone())
            .unwrap_or_else(|| env::panic_str("Predecessor has not registered for storage"));

        if self.accounts.contains_key(&account_id) {
            env::panic_str("Account already exists");
        }

        self.accounts.insert(
            account_id.to_string(),
            Account::new(vec![identity], self.max_nonce),
        );
        self.accounts.flush();

        self.storage_accounting(&predecessor, storage_usage_start)
            .unwrap_or_else(|e| env::panic_str(&e.to_string()));
    }

    #[private]
    pub fn remove_account(&mut self, account_id: String) {
        let account_nonce = self.accounts.get(&account_id).unwrap().nonce;
        if account_nonce > self.max_nonce {
            self.max_nonce = account_nonce;
        }

        self.accounts.remove(&account_id);
    }

    #[private]
    #[payable]
    pub fn add_identity(
        &mut self,
        account_id: String,
        identity: IdentityWithPermissions,
        #[callback_result] auth_result: Result<bool, near_sdk::PromiseError>,
    ) {
        match auth_result {
            Ok(true) => {
                self.accounts
                    .get_mut(&account_id)
                    .unwrap()
                    .add_identity(identity);
            }
            Ok(false) => env::panic_str("Authentication failed"),
            _ => env::panic_str("Failed to add auth identity"),
        }
    }

    #[private]
    pub fn remove_identity(&mut self, account_id: String, identity: &Identity) {
        let account = self.accounts.get_mut(&account_id).unwrap();
        account.remove_identity(identity);

        if account.identities.is_empty() {
            self.accounts.remove(&account_id);
        }
    }

    pub fn get_account_by_id(&self, account_id: String) -> Option<&Account> {
        self.accounts.get(&account_id)
    }

    pub fn list_account_ids(&self) -> Vec<String> {
        self.accounts.iter().map(|(key, _)| key.clone()).collect()
    }

    pub fn list_identities(&self, account_id: String) -> Option<Vec<IdentityWithPermissions>> {
        self.accounts
            .get(&account_id)
            .map(|account| account.identities.clone())
    }

    pub fn get_account_by_identity(&self, identity: Identity) -> Vec<String> {
        self.accounts
            .iter()
            .filter(|(_, account)| account.get_identity(&identity).is_some())
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
                self.remove_account(account_id);
            }
            Action::AddIdentityWithAuth(auth) => {
                // Decrement nonce since it was incremented on auth method
                let signed_message = action.to_signed_message((&account_id, account.nonce - 1));

                let mut identity = auth.identity_with_permissions.identity.clone();
                identity.inject_webauthn_compressed_public_key(&account);

                self.validate_credentials(
                    identity,
                    auth.credentials,
                    signed_message,
                    Self::ext(env::current_account_id())
                        .add_identity(account_id, auth.identity_with_permissions),
                );
            }
            Action::AddIdentity(identity_with_permissions) => {
                // If the auth identity doesn't have enable_act_as permission, we don't need its authorization
                // since it can only control the account but cannot be controlled by the account
                if let Some(ref permissions) = identity_with_permissions.permissions {
                    if !permissions.enable_act_as {
                        self.add_identity(account_id, identity_with_permissions, Ok(true));
                    } else {
                        env::panic_str("When enable_act_as permission is set, the identity must authorize being added through AddIdentityWithAuth");
                    }
                } else {
                    env::panic_str("Action not allowed");
                }
            }
            Action::RemoveIdentity(identity) => {
                self.remove_identity(account_id, &identity);
            }
            _ => env::panic_str("Invalid account action"),
        }

        self.accounts.flush();

        self.storage_accounting(&predecessor, storage_usage_start)
            .expect("Storage accounting failed");
    }
}
