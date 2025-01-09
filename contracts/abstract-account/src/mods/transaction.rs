use std::str::FromStr;

use crate::{traits::path::Path, types::auth_identities::AuthIdentity, AbstractAccountContract};
use near_sdk::{
    env, serde::{Deserialize, Serialize}, AccountId, Gas, Promise
};
use schemars::JsonSchema;

use super::signer::{ext_signer, SignRequest};

#[derive(Deserialize, Serialize, JsonSchema, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct SignPayloadsRequest {
    pub contract_id: String,
    pub payloads: Vec<SignRequest>
}

impl AbstractAccountContract {
    pub fn execute_transaction(&self, auth_identity: AuthIdentity, payloads: SignPayloadsRequest) -> Result<Promise, String> {
        let receiver_id = AccountId::from_str(&payloads.contract_id)
            .map_err(|_| "Invalid receiver account ID")?;
        let mut promise = Promise::new(receiver_id);
        // let deposit_per_call = env::attached_deposit().saturating_div(payloads.payloads.len() as u128);
        let gas_per_call = Gas::from_tgas(50);

        for payload in payloads.payloads {
            let path = self.build_account_path(auth_identity.path(), payload.path);

            let sign_request = SignRequest::new(
                payload.payload,
                path,
                0
            );

            promise = promise.then(ext_signer::ext(self.signer_account.clone())
                .with_attached_deposit(env::attached_deposit())
                .with_static_gas(gas_per_call)
                .sign(sign_request))
        }

        Ok(promise)
    }
}
