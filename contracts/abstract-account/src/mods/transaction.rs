use std::str::FromStr;

use crate::{types::auth_identity::AuthIdentity, AbstractAccountContract};
use interfaces::traits::path::Path;
use near_sdk::{
    env,
    serde::{Deserialize, Serialize},
    AccountId, Promise,
};
use schemars::JsonSchema;

use super::signer::{ext_signer, SignRequest, SIGN_GAS};

#[derive(Deserialize, Serialize, JsonSchema, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct SignPayloadsRequest {
    pub contract_id: String,
    pub payloads: Vec<SignRequest>,
}

impl AbstractAccountContract {
    pub fn execute_transaction(
        &self,
        auth_identity: AuthIdentity,
        payloads: SignPayloadsRequest,
    ) -> Result<Promise, String> {
        let receiver_id = AccountId::from_str(&payloads.contract_id)
            .map_err(|_| "Invalid receiver account ID")?;
        let mut promise = Promise::new(receiver_id);
        let deposit_per_call =
            env::attached_deposit().saturating_div(payloads.payloads.len() as u128);

        for payload in payloads.payloads {
            let path = self.build_account_path(auth_identity.path(), payload.path);

            let sign_request = SignRequest::new(payload.payload, path, payload.key_version);

            promise = promise.then(
                ext_signer::ext(self.signer_account.clone())
                    .with_attached_deposit(deposit_per_call)
                    .with_static_gas(SIGN_GAS)
                    .sign(sign_request),
            )
        }

        Ok(promise)
    }
}
