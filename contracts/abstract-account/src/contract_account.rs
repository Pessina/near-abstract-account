use crate::*;

impl AbstractAccountContract {
    pub fn add_account(&mut self, account_id: String, auth_identity: AuthIdentity) {
        if self.accounts.contains_key(&account_id) {
            env::panic_str("Account already exists");
        }

        self.accounts
            .insert(account_id, Account::new(vec![auth_identity]));
    }

    pub fn delete_account(&mut self, account_id: String) {
        // TODO: Include auth validation
        self.accounts.remove(&account_id);
    }

    pub fn add_auth_identity(&mut self, account_id: String, auth_identity: AuthIdentity) {
        // TODO: Include auth validation
        self.accounts
            .get_mut(&account_id)
            .unwrap()
            .add_auth_identity(auth_identity);
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
}
