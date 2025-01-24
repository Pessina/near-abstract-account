use crate::mods::signer::SignRequest;
use crate::types::auth_identity::AuthIdentity;
use near_sdk::serde::{Deserialize, Serialize};
use schemars::JsonSchema;
use serde_json::Value;

#[derive(Deserialize, Serialize, JsonSchema, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct UserOp {
    // Credentials must contain the signature of the transaction message in canonical JSON format.
    // The message is canonicalized to ensure consistent signatures across different platforms.
    pub auth: Auth,
    pub act_as: Option<AuthIdentity>,
    pub transaction: Transaction,
}

#[derive(Deserialize, Serialize, JsonSchema, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct Auth {
    pub auth_identity: AuthIdentity,
    pub credentials: Value,
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
pub enum Action {
    RemoveAccount,
    /*
    On AddAuthIdentity, AuthIdentity signer must sign the account_id, nonce and action to:
    1. Prove ownership of the AuthIdentity
    2. Declare which account it intends to be added to
    3. Prevent replay attacks
    4. Declare intention to add the AuthIdentity to the account
    */
    AddAuthIdentity(Auth),
    RemoveAuthIdentity(AuthIdentity),
    Sign(SignPayloadsRequest),
}

#[derive(Deserialize, Serialize, JsonSchema, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct SignPayloadsRequest {
    pub contract_id: String,
    pub payloads: Vec<SignRequest>,
}
