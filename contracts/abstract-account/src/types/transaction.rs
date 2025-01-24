use crate::mods::signer::SignRequest;
use crate::types::auth_identity::AuthIdentity;
use interfaces::traits::message::Message;
use near_sdk::{
    env,
    serde::{Deserialize, Serialize},
};
use schemars::JsonSchema;
use serde_json::{json, Value};

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

impl Message for Transaction {
    type Context<'a> = ();

    fn to_signed_message(&self, _: ()) -> String {
        serde_json_canonicalizer::to_string(&json!(self))
            .expect("Failed to canonicalize transaction")
    }
}

#[derive(Deserialize, Serialize, JsonSchema, Clone)]
#[serde(crate = "near_sdk::serde")]
pub enum Action {
    RemoveAccount,
    /*
    On AddAuthIdentity, AuthIdentity signer must sign the account_id, nonce and action to:
    1. Prove ownership of the AuthIdentity
    2. Declare which account it intends to be added to
    3. Prevent replay attacks
    4. Declare intention to add the AuthIdentity to the account
    */
    AddAuthIdentity(Auth),
    RemoveAuthIdentity(AuthIdentity),
    Sign(SignPayloadsRequest),
}

impl Message for Action {
    type Context<'a> = (&'a str, u128);

    fn to_signed_message(&self, (account_id, nonce): Self::Context<'_>) -> String {
        let action = match self {
            Action::AddAuthIdentity(_) => "AddAuthIdentity",
            _ => env::panic_str("to_signed_message not supported"),
        };

        serde_json_canonicalizer::to_string(&json!({
            "account_id": account_id,
            "nonce": nonce,
            "action": action,
        }))
        .expect("Failed to canonicalize transaction")
    }
}

#[derive(Deserialize, Serialize, JsonSchema, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct SignPayloadsRequest {
    pub contract_id: String,
    pub payloads: Vec<SignRequest>,
}
