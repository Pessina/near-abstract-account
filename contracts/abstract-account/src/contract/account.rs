use near_sdk_contract_tools::ft::Nep145Controller;

use crate::*;

#[near]
impl AbstractAccountContract {
    pub fn add_account(&mut self, account_id: String, auth_identity: AuthIdentity) {
        if self.accounts.contains_key(&account_id) {
            env::panic_str("Account already exists");
        }

        let storage_usage_start = env::storage_usage();
        let predecessor = env::predecessor_account_id();

        self.accounts.insert(
            account_id,
            Account::new(
                env::predecessor_account_id().to_string(),
                vec![auth_identity],
            ),
        );

        self.storage_accounting(&predecessor, storage_usage_start)
            .expect("Storage accounting failed");
    }

    #[private]
    pub fn delete_account(&mut self, account_id: String) {
        self.accounts.remove(&account_id);
    }

    #[private]
    pub fn add_auth_identity(&mut self, account_id: String, auth_identity: AuthIdentity) {
        self.accounts
            .get_mut(&account_id)
            .unwrap()
            .add_auth_identity(auth_identity);
    }

    #[private]
    pub fn remove_auth_identity(&mut self, account_id: String, auth_identity: AuthIdentity) {
        let account = self.accounts.get_mut(&account_id).unwrap();
        account.remove_auth_identity(auth_identity);

        if account.auth_identities.is_empty() {
            self.accounts.remove(&account_id);
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
    pub fn handle_account_operation(
        &mut self,
        predecessor: AccountId,
        account_id: String,
        operation: Transaction,
    ) {
        let storage_usage_start = env::storage_usage();

        match operation {
            Transaction::RemoveAccount => self.delete_account(account_id),
            Transaction::AddAuthIdentity(new_auth_identity) => {
                self.add_auth_identity(account_id, new_auth_identity)
            }
            Transaction::RemoveAuthIdentity(remove_auth_identity) => {
                self.remove_auth_identity(account_id, remove_auth_identity)
            }
            _ => env::panic_str("Invalid account operation"),
        }

        self.storage_accounting(&predecessor, storage_usage_start)
            .expect("Storage accounting failed");
    }
}
