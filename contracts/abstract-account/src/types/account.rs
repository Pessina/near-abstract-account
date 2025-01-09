
use near_sdk::{
    borsh::{self, BorshDeserialize, BorshSerialize},
    serde::{Deserialize, Serialize},
};
use schemars::JsonSchema;
use super::auth_identities::AuthIdentity;

#[derive(Debug, BorshDeserialize, BorshSerialize, Deserialize, Serialize, JsonSchema, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct Account {
    pub auth_identities: Vec<AuthIdentity>,
}

impl Account {
    pub fn new(auth_identities: Vec<AuthIdentity>) -> Self {
        Self { 
            auth_identities, 
        }
    }

    pub fn has_auth_identity(&self, auth_identity: &AuthIdentity) -> bool {
        self.auth_identities.contains(auth_identity)
    }
}
