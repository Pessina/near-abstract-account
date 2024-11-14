use near_sdk::serde::{Deserialize, Serialize};
use schemars::JsonSchema;

#[derive(Deserialize, Serialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct WebAuthnData {
    pub signature: String,
    pub authenticator_data: String,
    pub client_data: String,
}
