use crate::mods::transaction::Transaction;
use interfaces::webauthn_auth::WebAuthnData;
use near_sdk::serde::{Deserialize, Serialize};
use schemars::JsonSchema;
use serde_json::Value;

#[derive(Deserialize, Serialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct UserOp {
    pub auth: Auth,
    pub transaction: Transaction,
}

#[derive(Deserialize, Serialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct Auth {
    pub auth_type: String,
    pub auth_data: Value,
}

#[derive(Deserialize, Serialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct WebAuthnAuth {
    pub public_key_id: String,
    pub webauthn_data: WebAuthnData,
}
