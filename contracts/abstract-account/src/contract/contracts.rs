use crate::*;

#[near]
impl AbstractAccountContract {
    pub fn get_all_contracts(&self) -> Vec<String> {
        self.auth_contracts
            .iter()
            .map(|(_, value)| value.to_string())
            .collect()
    }

    pub fn get_signer_account(&self) -> String {
        self.signer_account.clone().into()
    }
}
