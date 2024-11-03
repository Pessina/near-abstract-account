use interfaces::webauthn_auth::WebAuthnData;
use near_sdk::serde::{Deserialize, Serialize};
use schemars::JsonSchema;
use serde_json::Value;

// TODO: Those types should be imported from near libs and we should also find a way to automatically convert them to u64 and u128, without using parse.
type Gas = String; // u64;
type Balance = String; // u128;

#[derive(Deserialize, Serialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct FunctionCallAction {
    pub method_name: String,
    pub args: Vec<u8>,
    pub gas: Gas,
    pub deposit: Balance,
}

#[derive(Deserialize, Serialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct TransferAction {
    pub deposit: Balance,
}

#[derive(Deserialize, Serialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub enum Action {
    Transfer(TransferAction),
    FunctionCall(FunctionCallAction),
}

#[derive(Deserialize, Serialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct Transaction {
    pub receiver_id: String,
    pub actions: Vec<Action>,
}

#[derive(Deserialize, Serialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct UserOperation {
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
