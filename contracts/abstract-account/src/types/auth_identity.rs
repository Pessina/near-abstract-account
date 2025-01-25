use interfaces::{
    auth::{oidc::OIDCAuthenticator, wallet::WalletAuthenticator, webauthn::WebAuthnAuthenticator},
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
pub struct IdentityPermissions {
    pub enable_act_as: bool,
    /*
    TODO: Add other permissions here
    - whitelisted actions/methods/contracts/accounts/tokens
    - spent allowance on gas/transfer per day and absolute limit
    */
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
pub enum AuthTypes {
    Wallet(WalletAuthenticator),
    WebAuthn(WebAuthnAuthenticator),
    OIDC(OIDCAuthenticator),
    Account(String),
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
pub struct AuthIdentity {
    pub authenticator: AuthTypes,
    /// None means the identity has full access permissions
    pub permissions: Option<IdentityPermissions>,
}

impl Path for AuthTypes {
    fn path(&self) -> String {
        match self {
            AuthTypes::Wallet(wallet) => wallet.path(),
            AuthTypes::WebAuthn(webauthn) => webauthn.path(),
            AuthTypes::OIDC(oidc) => oidc.path(),
            AuthTypes::Account(account) => format!("{}", account),
        }
    }
}

// TODO: This should be implemented on a better way, probably on impl AuthIdentity
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
    Ord,
    PartialOrd,
    Hash,
)]
#[serde(crate = "near_sdk::serde")]
pub enum AuthTypeNames {
    EthereumWallet,
    SolanaWallet,
    WebAuthn,
    OIDC,
    Account,
}
