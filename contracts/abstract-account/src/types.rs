use crate::mods::transaction::SignPayloadsRequest;
use near_sdk::{
    borsh::{self, BorshDeserialize, BorshSerialize},
    serde::{Deserialize, Serialize},
};
use schemars::JsonSchema;
use serde_json::Value;

#[derive(Deserialize, Serialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct UserOp {
    pub account_id: String,
    pub auth: Auth,
    pub payloads: SignPayloadsRequest,
}

#[derive(Deserialize, Serialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct Auth {
    pub auth_identity: AuthIdentity,
    pub auth_data: Value,
}

#[derive(Debug, BorshDeserialize, BorshSerialize, Deserialize, Serialize, JsonSchema, PartialEq, Eq, Clone)]
#[serde(crate = "near_sdk::serde")] 
pub enum WalletType {
    Ethereum,
    Solana,
}

#[derive(Debug, BorshDeserialize, BorshSerialize, Deserialize, Serialize, JsonSchema, PartialEq, Eq, Clone)]
#[serde(crate = "near_sdk::serde")] 
pub struct Wallet {
    pub wallet_type: WalletType,
    pub public_key: String, // Compressed public key if possible
}
#[derive(Debug, BorshDeserialize, BorshSerialize, Deserialize, Serialize, JsonSchema, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct WebAuthn {
    pub key_id: String,
    // Optional because we are not able to get the key when signing with passkeys. So we need to store it on creation and retrieve on authentication
    pub compressed_public_key: Option<String>,
}

impl PartialEq for WebAuthn {
    fn eq(&self, other: &Self) -> bool {
        self.key_id == other.key_id && 
        match (&self.compressed_public_key, &other.compressed_public_key) {
            (Some(a), Some(b)) => a == b,
            _ => true
        }
    }
}

impl Eq for WebAuthn {}

#[derive(Debug, BorshDeserialize, BorshSerialize, Deserialize, Serialize, JsonSchema, PartialEq, Eq, Clone)]
#[serde(crate = "near_sdk::serde")] 
pub struct OIDC {
    pub client_id: String,
    pub issuer: String, 
    pub email: String
}

#[derive(Debug, BorshDeserialize, BorshSerialize, Deserialize, Serialize, JsonSchema, PartialEq, Eq, Clone)]
#[serde(crate = "near_sdk::serde")]
pub enum AuthIdentity {
    Wallet(Wallet),
    WebAuthn(WebAuthn),
    OIDC(OIDC),
    Account(String),
}

#[derive(Debug, BorshDeserialize, BorshSerialize, Deserialize, Serialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct Account {
    pub auth_identities: Vec<AuthIdentity>,
}

impl Account {
    pub fn new(auth_identities: Vec<AuthIdentity>) -> Self {
        Self { 
            auth_identities, 
        }
    }

    pub fn has_auth_identity(&self, auth_identity: &AuthIdentity) -> bool {
        self.auth_identities.contains(auth_identity)
    }
}
