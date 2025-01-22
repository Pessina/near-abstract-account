pub fn build_account_path(account_id: String, path: String) -> String {
    format!("{},{}", account_id, path)
}
