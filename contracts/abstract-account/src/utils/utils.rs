use near_sdk::serde;

pub fn build_account_path(account_id: String, path: String) -> String {
    format!("{},{}", account_id, path)
}

pub fn parse_credentials<T>(credentials_json: &serde_json::Value) -> T
where
    T: serde::de::DeserializeOwned,
{
    serde_json::from_str(&credentials_json.to_string()).expect("Invalid credentials data")
}
