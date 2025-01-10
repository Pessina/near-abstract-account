use near_sdk::serde::{Deserialize, Serialize};
use schemars::JsonSchema;

#[derive(Serialize, Deserialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct OIDCData {
    pub token: String,
    pub message: String,
}

#[derive(Serialize, Deserialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct OIDCAuthIdentity {
    pub client_id: String,
    pub issuer: String, 
    pub email: String
}



