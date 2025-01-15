use interfaces::{
    auth::{oidc::OIDCAuthIdentity, wallet::WalletAuthIdentity, webauthn::WebAuthnAuthIdentity},
    traits::path::Path,
};
use near_sdk::{
    borsh::{self, BorshDeserialize, BorshSerialize},
    serde::{Deserialize, Serialize},
};
use schemars::JsonSchema;

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
pub enum AuthIdentity {
    Wallet(WalletAuthIdentity),
    WebAuthn(WebAuthnAuthIdentity),
    OIDC(OIDCAuthIdentity),
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
