use interfaces::webauthn_auth::WebAuthnData;
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

// Define WebAuthnAuth struct using imported types
#[derive(Deserialize, Serialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct WebAuthnAuth {
    pub compressed_public_key: String,
    pub webauthn_data: WebAuthnData,
}
