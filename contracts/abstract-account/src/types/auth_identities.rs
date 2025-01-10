use near_sdk::{
    borsh::{self, BorshDeserialize, BorshSerialize},
    serde::{Deserialize, Serialize},
};
use schemars::JsonSchema;
use crate::traits::path::Path;

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

impl Path for Wallet {
    fn path(&self) -> String {
        match self.wallet_type {
            WalletType::Ethereum => {
                let key = self.public_key.strip_prefix("0x").unwrap_or(&self.public_key);
                if let Ok(public_key) = hex::decode(key) {
                    let hash = near_sdk::env::keccak256(&public_key[1..]);
                    let address = &hash[12..];
                    format!("0x{}", hex::encode(address))
                } else {
                    format!("{}", self.public_key)
                }
            },
            WalletType::Solana => {
                format!("{}", self.public_key)
            },
        }
    }
}

#[derive(Debug, BorshDeserialize, BorshSerialize, Deserialize, Serialize, JsonSchema, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct WebAuthn {
    pub key_id: String,
    // Optional because we are not able to get the key when signing with passkeys. So we need to store it on creation and retrieve on authentication
    pub compressed_public_key: Option<String>,
}

impl Path for WebAuthn {
    fn path(&self) -> String {
        format!("{}", self.compressed_public_key.as_ref().expect("Compressed public key not set for WebAuthn"))
    }
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

impl Path for OIDC {
    fn path(&self) -> String {
        // format!("oidc/{}/{}/{}", self.issuer, self.client_id, self.email)
        format!("{}", self.email)
    }
}

#[derive(Debug, BorshDeserialize, BorshSerialize, Deserialize, Serialize, JsonSchema, PartialEq, Eq, Clone)]
#[serde(crate = "near_sdk::serde")]
pub enum AuthIdentity {
    Wallet(Wallet),
    WebAuthn(WebAuthn),
    OIDC(OIDC),
    Account(String),
}

impl Path for AuthIdentity {
    fn path(&self) -> String {
        match self {
            AuthIdentity::Wallet(wallet) => wallet.path(),
            AuthIdentity::WebAuthn(webauthn) => webauthn.path(),
            AuthIdentity::OIDC(oidc) => oidc.path(),
            AuthIdentity::Account(account) => format!("{}", account),
        }
    }
}