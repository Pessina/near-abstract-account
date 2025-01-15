use crate::mods::transaction::SignPayloadsRequest;
use crate::types::auth_identity::AuthIdentity;
use near_sdk::serde::{Deserialize, Serialize};
use schemars::JsonSchema;
use serde_json::Value;

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
    pub authenticator: AuthIdentity,
    pub credentials: Value,
}
