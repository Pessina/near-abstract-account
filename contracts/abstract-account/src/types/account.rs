use super::auth_identity::AuthIdentity;
use near_sdk::{
    borsh::{self, BorshDeserialize, BorshSerialize},
    serde::{Deserialize, Serialize},
};
use schemars::JsonSchema;

#[derive(Debug, BorshDeserialize, BorshSerialize, Deserialize, Serialize, JsonSchema, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct Account {
    pub creator_id: String,
    pub auth_identities: Vec<AuthIdentity>,
}

impl Account {
    pub fn new(creator_id: String, auth_identities: Vec<AuthIdentity>) -> Self {
        Self {
            creator_id,
            auth_identities,
        }
    }

    pub fn has_auth_identity(&self, auth_identity: &AuthIdentity) -> bool {
        self.auth_identities.contains(auth_identity)
    }

    pub fn add_auth_identity(&mut self, auth_identity: AuthIdentity) {
        self.auth_identities.push(auth_identity);
    }

    pub fn remove_auth_identity(&mut self, auth_identity: AuthIdentity) {
        self.auth_identities
            .retain(|identity| identity != &auth_identity);
    }
}
