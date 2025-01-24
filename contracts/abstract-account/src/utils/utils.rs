use near_sdk::serde;
use serde_json::Value;

pub fn build_account_path(account_id: String, path: String) -> String {
    format!("{},{}", account_id, path)
}

// Raw message allows direct signature verification by wallets and other auth methods
pub fn get_signed_message(message: &Value) -> String {
    serde_json_canonicalizer::to_string(message).expect("Failed to canonicalize transaction")
}

pub fn parse_credentials<T>(credentials_json: &serde_json::Value) -> T
where
    T: serde::de::DeserializeOwned,
{
    serde_json::from_str(&credentials_json.to_string()).expect("Invalid credentials data")
}
