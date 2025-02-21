use interfaces::{
    auth::{oidc::OIDCAuthenticator, wallet::WalletAuthenticator, webauthn::WebAuthnAuthenticator},
    traits::path::Path,
};
use near_sdk::{
    borsh::{self, BorshDeserialize, BorshSerialize},
    serde::{Deserialize, Serialize},
};
use schemars::JsonSchema;

use super::account::Account;

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

    For EVM contract calls, the callData in UserOp and data in FunctionCall are encoded.
    We cannot trust user-provided signatures for decoding since malicious signatures could
    decode the same encoded data differently (no 1:1 mapping).

    To handle this securely, we should:
    1. Whitelist both the contract address and its ABI on the user account
    2. Use the whitelisted ABI to decode the data when session keys request signatures
    3. Validate the decoded data matches the intended function call
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
pub enum Identity {
    Wallet(WalletAuthenticator),
    WebAuthn(WebAuthnAuthenticator),
    OIDC(OIDCAuthenticator),
    Account(String),
}

impl Identity {
    /// Injects the compressed public key into a WebAuthn identity from an account's stored identity
    /// If the identity is not WebAuthn, logs a message and does nothing
    pub fn inject_webauthn_compressed_public_key(&mut self, account: &Account) {
        match self {
            Identity::WebAuthn(webauthn) => {
                let webauthn_authenticator = account
                    .identities
                    .iter()
                    .find_map(|identity_with_permissions| {
                        if let Identity::WebAuthn(ref current_webauthn) =
                            identity_with_permissions.identity
                        {
                            if current_webauthn.key_id == webauthn.key_id {
                                return Some(current_webauthn);
                            }
                        }
                        None
                    })
                    .expect("WebAuthn Key ID not found on Account");

                let compressed_public_key = webauthn_authenticator
                    .compressed_public_key
                    .as_ref()
                    .expect("WebAuthnAuthenticator does not have a compressed public key");

                webauthn.compressed_public_key = Some(compressed_public_key.to_string());
            }
            _ => {}
        }
    }
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
pub struct IdentityWithPermissions {
    pub identity: Identity,
    /// None means the identity has full access permissions
    pub permissions: Option<IdentityPermissions>,
}

impl Path for Identity {
    fn path(&self) -> String {
        match self {
            Identity::Wallet(wallet) => wallet.path(),
            Identity::WebAuthn(webauthn) => webauthn.path(),
            Identity::OIDC(oidc) => oidc.path(),
            Identity::Account(account) => format!("{}", account),
        }
    }
}

// TODO: This should be implemented on a better way, probably on impl IdentityWithPermissions
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
