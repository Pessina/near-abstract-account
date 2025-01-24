use near_sdk::{
    borsh::{BorshDeserialize, BorshSerialize},
    serde::{Deserialize, Serialize},
};
use schemars::JsonSchema;

use crate::traits::path::Path;

#[derive(Debug, BorshDeserialize, BorshSerialize, Deserialize, Serialize, JsonSchema, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct WebAuthnAuthenticator {
    pub key_id: String,
    // The compressed public key is optional since it cannot be obtained during passkey signing.
    // It must be stored during key creation and retrieved during authentication.
    pub compressed_public_key: Option<String>,
}

impl Path for WebAuthnAuthenticator {
    fn path(&self) -> String {
        format!(
            "{}",
            self.compressed_public_key
                .as_ref()
                .expect("Compressed public key not set for WebAuthn")
        )
    }
}

impl PartialEq for WebAuthnAuthenticator {
    fn eq(&self, other: &Self) -> bool {
        self.key_id == other.key_id
            && match (&self.compressed_public_key, &other.compressed_public_key) {
                (Some(a), Some(b)) => a == b,
                _ => true,
            }
    }
}

impl Eq for WebAuthnAuthenticator {}

#[derive(Deserialize, Serialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct WebAuthnCredentials {
    pub signature: String,
    pub authenticator_data: String,
    pub client_data: String,
}

#[derive(Serialize, Deserialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct WebAuthnValidationData {
    pub signature: String,
    pub authenticator_data: String,
    pub client_data: String,
}
