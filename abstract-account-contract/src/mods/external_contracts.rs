use near_sdk::ext_contract;
use near_sdk::serde::{Deserialize, Serialize};
use schemars::JsonSchema;

// TODO: Copied from auth-contracts/webauthn-auth-contract/src/types.rs, replace with a dependency

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
    pub signature: Signature,
    pub authenticator_data: String,
    pub client_data: String,
}

#[ext_contract(webauthn_auth)]
pub trait WebAuthnAuth {
    fn validate_p256_signature(&self, webauthn_data: WebAuthnData, public_key: PublicKey) -> bool;
}
