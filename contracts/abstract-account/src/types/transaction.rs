use crate::mods::signer::SignRequest;
use crate::types::auth_identity::AuthIdentity;
use interfaces::traits::signable_message::SignableMessage;
use near_sdk::{
    env,
    serde::{Deserialize, Serialize},
};
use schemars::JsonSchema;
use serde_json::Value;

use super::auth_identity::IdentityPermissions;

#[derive(Deserialize, Serialize, JsonSchema, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct UserOp {
    // Credentials must contain the signature of the transaction message in canonical JSON format.
    // The message is canonicalized to ensure consistent signatures across different platforms.
    pub auth: Auth,
    pub act_as: Option<AuthIdentity>,
    pub transaction: Transaction,
}

#[derive(Deserialize, Serialize, JsonSchema, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct Auth {
    pub auth_identity: AuthIdentity,
    pub credentials: Value,
}

#[derive(Deserialize, Serialize, JsonSchema, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct Transaction {
    pub account_id: String,
    pub nonce: u128,
    pub action: Action,
}

impl SignableMessage for Transaction {
    type Context<'a> = ();

    fn to_signed_message(&self, _: ()) -> String {
        serde_json_canonicalizer::to_string(&self).expect("Failed to canonicalize transaction")
    }
}

#[derive(Deserialize, Serialize, JsonSchema, Clone)]
#[serde(crate = "near_sdk::serde")]
pub enum Action {
    RemoveAccount,
    /*
    Credentials must contain the signature of account_id, nonce, action, permissions to:
    1. Prove ownership of the AuthIdentity
    2. Declare which account it intends to be added to
    3. Prevent replay attacks
    4. Declare intention to add the AuthIdentity to the account with the given permissions
    */
    AddAuthIdentityWithAuth(Auth),
    AddAuthIdentity(AuthIdentity),
    RemoveAuthIdentity(AuthIdentity),
    Sign(SignPayloadsRequest),
}

#[derive(Serialize, Deserialize, JsonSchema, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct ActionSignableMessage {
    pub account_id: String,
    pub nonce: String,
    pub action: String,
    pub permissions: Option<IdentityPermissions>,
}

impl SignableMessage for Action {
    type Context<'a> = (&'a str, u128);

    fn to_signed_message(&self, (account_id, nonce): Self::Context<'_>) -> String {
        match self {
            Action::AddAuthIdentityWithAuth(auth) => {
                serde_json_canonicalizer::to_string(&ActionSignableMessage {
                    account_id: account_id.to_string(),
                    nonce: nonce.to_string(),
                    action: "AddAuthIdentityWithAuth".to_string(),
                    permissions: auth.auth_identity.permissions.clone(),
                })
                .expect("Failed to canonicalize action")
            }
            _ => env::panic_str("to_signed_message not supported"),
        }
    }
}

#[derive(Deserialize, Serialize, JsonSchema, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct SignPayloadsRequest {
    pub contract_id: String,
    pub payloads: Vec<SignRequest>,
}
