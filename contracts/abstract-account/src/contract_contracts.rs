use crate::*;

// TODO: All this methods should include validation on the owner or be locked after deployment
impl AbstractAccountContract {
    pub fn set_auth_contract(
        &mut self,
        auth_identity_name: AuthIdentityNames,
        contract_id: AccountId,
    ) {
        self.auth_contracts.insert(auth_identity_name, contract_id);
    }

    pub fn get_auth_contract(&self, auth_identity_name: AuthIdentityNames) -> Option<AccountId> {
        self.auth_contracts.get(&auth_identity_name).cloned()
    }

    pub fn set_signer_account(&mut self, signer_account: AccountId) {
        self.signer_account = signer_account;
    }

    pub fn get_signer_account(&self) -> AccountId {
        self.signer_account.clone()
    }
}
