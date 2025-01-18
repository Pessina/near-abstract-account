use crate::*;
use crate::{
    types::{auth_identity::AuthIdentity, transaction::Transaction},
    AbstractAccountContract,
};
use interfaces::traits::path::Path;
use mods::signer::{ext_signer, SignRequest, SIGN_GAS};
use near_sdk::{env, near, Promise};
use types::transaction::SignPayloadsRequest;
use utils::utils::build_account_path;

#[near]
impl AbstractAccountContract {
    #[private]
    pub fn execute_transaction(
        &mut self,
        account_id: String,
        auth_identity: AuthIdentity,
        transaction: Transaction,
    ) -> Promise {
        // TODO: The empty promise it's to fix the type issue in Rust, check how to fix it
        match transaction {
            Transaction::Sign(sign_payloads_request) => {
                self.sign(auth_identity, sign_payloads_request)
            }
            Transaction::RemoveAccount => {
                self.delete_account(account_id);
                Promise::new(env::predecessor_account_id())
            }
            Transaction::AddAuthIdentity(new_auth_identity) => {
                self.add_auth_identity(account_id, new_auth_identity);
                Promise::new(env::predecessor_account_id())
            }
            Transaction::RemoveAuthIdentity(remove_auth_identity) => {
                self.remove_auth_identity(account_id, remove_auth_identity);
                Promise::new(env::predecessor_account_id())
            }
        }
    }

    #[private]
    pub fn sign(
        &self,
        auth_identity: AuthIdentity,
        sign_payloads_request: SignPayloadsRequest,
    ) -> Promise {
        let mut promise = Promise::new(
            sign_payloads_request
                .contract_id
                .parse()
                .expect("Invalid contract_id"),
        );
        let deposit_per_call =
            env::attached_deposit().saturating_div(sign_payloads_request.payloads.len() as u128);

        for payload in sign_payloads_request.payloads {
            let path = build_account_path(auth_identity.path(), payload.path);

            let sign_request = SignRequest::new(payload.payload, path, payload.key_version);

            promise = promise.then(
                ext_signer::ext(self.signer_account.clone())
                    .with_attached_deposit(deposit_per_call)
                    .with_static_gas(SIGN_GAS)
                    .sign(sign_request),
            )
        }

        promise
    }
}
