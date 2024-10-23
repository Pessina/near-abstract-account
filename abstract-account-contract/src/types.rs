use near_sdk::serde::{Deserialize, Serialize};
use schemars::JsonSchema;
use serde_json::Value;

#[derive(Deserialize, Serialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct UserOperation {
    pub auth: Auth,
}

#[derive(Deserialize, Serialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct Auth {
    pub auth_type: String,
    pub auth_data: Value,
}

// -------- Should be imported from auth-contracts/webauthn-auth-contract/src/types.rs

#[derive(Deserialize, Serialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct Signature {
    pub r: String,
    pub s: String,
}

#[derive(Deserialize, Serialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct WebAuthnData {
    pub signature: Signature,
    pub authenticator_data: String,
    pub client_data: String,
}

#[derive(Deserialize, Serialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct WebAuthnAuth {
    pub public_key: String,
    pub webauthn_data: WebAuthnData,
}
