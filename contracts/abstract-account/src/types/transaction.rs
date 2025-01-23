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
pub struct AuthIdentityRequest {
    /*
    AuthIdentity signer must sign the account_id and nonce to:
    1. Prove ownership of the AuthIdentity
    2. Declare which account it intends to be added to
    3. Prevent replay attacks
    */
    pub credentials: Value,
    pub auth_identity: AuthIdentity,
}

#[derive(Deserialize, Serialize, JsonSchema, Clone)]
#[serde(crate = "near_sdk::serde")]
pub enum Action {
    RemoveAccount,
    AddAuthIdentity(AuthIdentityRequest),
    RemoveAuthIdentity(AuthIdentity),
    Sign(SignPayloadsRequest),
}

#[derive(Deserialize, Serialize, JsonSchema, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct Transaction {
    pub account_id: String,
    pub nonce: u128,
    pub action: Action,
}

#[derive(Deserialize, Serialize, JsonSchema, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct UserOp {
    pub auth: Auth,
    pub selected_auth_identity: Option<AuthIdentity>,
    pub transaction: Transaction,
}

#[derive(Deserialize, Serialize, JsonSchema, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct Auth {
    pub authenticator: AuthIdentity,
    pub credentials: Value,
}
