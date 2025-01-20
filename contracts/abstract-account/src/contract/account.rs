use crate::*;

#[near]
impl AbstractAccountContract {
    pub fn add_account(&mut self, account_id: String, auth_identity: AuthIdentity) {
        if self.accounts.contains_key(&account_id) {
            env::panic_str("Account already exists");
        }

        self.accounts
            .insert(account_id, Account::new(vec![auth_identity]));
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
}
