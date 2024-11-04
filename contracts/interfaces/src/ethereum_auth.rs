use near_sdk::serde::{Deserialize, Serialize};
use schemars::JsonSchema;

#[derive(Serialize, Deserialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct Signature {
    pub r: String,
    pub s: String,
    pub v: String,
}

#[derive(Serialize, Deserialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct EthereumData {
    pub message: String,
    pub signature: Signature,
}
