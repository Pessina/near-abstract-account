use near_sdk::serde::{Deserialize, Serialize};
use schemars::JsonSchema;

#[derive(Deserialize, Serialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct PublicKey {
    pub x: String,
    pub y: String,
}

#[derive(Deserialize, Serialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct Signature {
    pub r: String,
    pub s: String,
}

#[derive(Deserialize, Serialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct WebAuthnData {
    pub public_key: PublicKey,
    pub signature: Signature,
    pub authenticator_data: String,
    pub client_data: String,
}
