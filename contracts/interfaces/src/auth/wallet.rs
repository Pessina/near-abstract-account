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
pub enum WalletType {
    Ethereum,
    Solana,
}

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
pub struct WalletAuthIdentity {
    pub wallet_type: WalletType,
    pub public_key: String, // TODO: Compressed public key if possible
}

impl Path for WalletAuthIdentity {
    fn path(&self) -> String {
        match self.wallet_type {
            WalletType::Ethereum => {
                let key = self
                    .public_key
                    .strip_prefix("0x")
                    .unwrap_or(&self.public_key);
                if let Ok(public_key) = hex::decode(key) {
                    let hash = near_sdk::env::keccak256(&public_key[1..]);
                    let address = &hash[12..];
                    format!("0x{}", hex::encode(address))
                } else {
                    format!("{}", self.public_key)
                }
            }
            WalletType::Solana => {
                format!("{}", self.public_key)
            }
        }
    }
}

#[derive(Serialize, Deserialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct WalletCredentials {
    pub signature: String,
}

#[derive(Serialize, Deserialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct WalletValidationData {
    pub signature: String,
    pub message: String,
}
