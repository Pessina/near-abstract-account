use crate::mods::signer::SignRequest;
use crate::types::auth_identity::AuthIdentity;
use near_sdk::serde::{Deserialize, Serialize};
use schemars::JsonSchema;
use serde_json::Value;

#[derive(Deserialize, Serialize, JsonSchema, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct SignPayloadsRequest {
    pub contract_id: String,
    pub payloads: Vec<SignRequest>,
}

#[derive(Deserialize, Serialize, JsonSchema, Clone)]
#[serde(crate = "near_sdk::serde")]
pub enum Transaction {
    RemoveAccount,
    AddAuthIdentity(AuthIdentity),
    RemoveAuthIdentity(AuthIdentity),
    Sign(SignPayloadsRequest),
}

#[derive(Deserialize, Serialize, JsonSchema, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct UserOp {
    pub account_id: String,
    pub auth: Auth,
    // TODO: Security issue, a user can add a auth identity and user it without proving ownership
    pub selected_auth_identity: Option<AuthIdentity>,
    pub transaction: Transaction,
}

#[derive(Deserialize, Serialize, JsonSchema, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct Auth {
    pub authenticator: AuthIdentity,
    pub credentials: Value,
}
