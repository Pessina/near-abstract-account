use near_sdk::serde;

use crate::types::transaction::Transaction;

pub fn build_account_path(account_id: String, path: String) -> String {
    format!("{},{}", account_id, path)
}

// Raw message allows direct signature verification by wallets and other auth methods
pub fn get_signed_message(transaction: &Transaction) -> String {
    let message = serde_json_canonicalizer::to_string(transaction)
        .expect("Failed to canonicalize transaction");
    message
}

pub fn extract_credentials<T>(credentials_json: &serde_json::Value) -> T
where
    T: serde::de::DeserializeOwned,
{
    serde_json::from_str(&credentials_json.to_string()).expect("Invalid credentials data")
}
