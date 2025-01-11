use crate::mods::transaction::SignPayloadsRequest;
use near_sdk::serde::{Deserialize, Serialize};
use schemars::JsonSchema;
use serde_json::Value;

use super::auth_identities::AuthIdentity;

#[derive(Deserialize, Serialize, JsonSchema, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct UserOp {
    pub account_id: String,
    pub auth: Auth,
    pub selected_auth_identity: Option<AuthIdentity>,
    pub payloads: SignPayloadsRequest,
}

#[derive(Deserialize, Serialize, JsonSchema, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct Auth {
    pub auth_identity: AuthIdentity,
    pub auth_data: Value,
}