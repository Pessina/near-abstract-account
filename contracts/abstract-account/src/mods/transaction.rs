use std::str::FromStr;

use crate::{traits::path::Path, types::auth_identities::AuthIdentity, AbstractAccountContract};
use near_sdk::{
    env, serde::{Deserialize, Serialize}, AccountId, Gas, NearToken, Promise
};
use schemars::JsonSchema;

use super::signer::SignRequest;

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
        let deposit_per_call = env::attached_deposit().as_yoctonear() / payloads.payloads.len() as u128;
        let gas_per_call = env::prepaid_gas().as_gas() / payloads.payloads.len() as u64;

        for payload in payloads.payloads {
            let path = self.build_account_path(auth_identity.path(), payload.path);

            promise = promise.function_call(
                path,
                payload.payload.to_vec(),
                NearToken::from_yoctonear(deposit_per_call),
                Gas::from_gas(gas_per_call),
            );
        }

        Ok(promise)
    }
}
