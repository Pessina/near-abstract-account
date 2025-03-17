use near_sdk::{
    borsh::{BorshDeserialize, BorshSerialize},
    serde::{Deserialize, Serialize},
};
use schemars::JsonSchema;

use crate::traits::path::Path;

#[derive(
    Debug,
    BorshDeserialize,
    BorshSerialize,
    Deserialize,
    Serialize,
    JsonSchema,
    PartialEq,
    Eq,
    Clone,
)]
#[serde(crate = "near_sdk::serde")]
pub struct OIDCAuthenticator {
    pub client_id: String,
    pub issuer: String,
    pub email: Option<String>,
    pub sub: Option<String>,
}

impl Path for OIDCAuthenticator {
    fn path(&self) -> String {
        let issuer = &self.issuer;
        let client_id = &self.client_id;

        match (self.email.as_ref(), self.sub.as_ref()) {
            (_, Some(sub)) => format!("oidc/{}/{}/{}", issuer, client_id, sub),
            (Some(email), None) => format!("oidc/{}/{}/{}", issuer, client_id, email),
            (None, None) => panic!("OIDC auth identity must have either email or sub"),
        }
    }
}

#[derive(Serialize, Deserialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct OIDCCredentials {
    pub token: String,
}

#[derive(Serialize, Deserialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct OIDCValidationData {
    pub token: String,
    pub message: String,
}
