use super::auth_identity::{Identity, IdentityWithPermissions};
use near_sdk::{
    borsh::{self, BorshDeserialize, BorshSerialize},
    serde::{Deserialize, Serialize},
};
use schemars::JsonSchema;

#[derive(Debug, BorshDeserialize, BorshSerialize, Deserialize, Serialize, JsonSchema, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct Account {
    pub identities: Vec<IdentityWithPermissions>,
    pub nonce: u128,
}

impl Account {
    pub fn new(identities: Vec<IdentityWithPermissions>, nonce: u128) -> Self {
        Self { identities, nonce }
    }

    pub fn get_identity(&self, identity: &Identity) -> Option<&IdentityWithPermissions> {
        self.identities
            .iter()
            .find(|curr| &curr.identity == identity)
    }

    pub fn add_identity(&mut self, identity: IdentityWithPermissions) {
        self.identities.push(identity);
    }

    pub fn remove_identity(&mut self, identity: &Identity) {
        self.identities.retain(|curr| &curr.identity != identity);
    }
}
