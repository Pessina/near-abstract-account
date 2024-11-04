use near_sdk::serde::{Deserialize, Serialize};
use schemars::JsonSchema;

#[derive(Deserialize, Serialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct SolanaData {
    pub message: String,
    pub signature: String,
}
