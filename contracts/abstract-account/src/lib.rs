mod mods;
mod types;
mod traits;

use mods::transaction::SignPayloadsRequest;
use near_sdk::{env, log, near, require, store::LookupMap, AccountId, Promise};
use types::{account::Account, auth_identities::{AuthIdentity, WalletType}, transaction::UserOp};

#[near(contract_state)]
pub struct AbstractAccountContract {
    owner: AccountId,
    accounts: LookupMap<String, Account>, // account_id -> account (auth_identities)
    auth_contracts: LookupMap<String, AccountId>,
    signer_account: AccountId,
}

impl Default for AbstractAccountContract {
    fn default() -> Self {
        let mut auth_contracts = LookupMap::new(b"q");
        auth_contracts.insert("webauthn".to_string(), "felipe-webauthn-contract.testnet".parse().unwrap());
        auth_contracts.insert("ethereum".to_string(), "felipe-ethereum-contract.testnet".parse().unwrap());
        auth_contracts.insert("solana".to_string(), "felipe-solana-contract.testnet".parse().unwrap());

        Self {
            accounts: LookupMap::new(b"e"),
            owner: env::predecessor_account_id(),
            auth_contracts,
            signer_account: "v1.signer-prod.testnet".parse().unwrap(),
        }
    }
}

#[near]
impl AbstractAccountContract {
    #[init(ignore_state)]
    pub fn new() -> Self {
        Self::default()
    }

    #[private]
    pub fn assert_owner(&self) {
        require!(
            env::predecessor_account_id() == self.owner,
            "Access denied: caller is not the owner"
        );
    }

    pub fn add_account(&mut self, account_id: String, auth_identity: AuthIdentity) {
        if self.accounts.contains_key(&account_id) {
            env::panic_str("Account already exists");
        }

        self.accounts.insert(account_id, Account::new(vec![auth_identity]));
    }

    pub fn get_account_by_id(&self, account_id: String) -> Option<&Account> {
        self.accounts.get(&account_id)
    }

    // TODO: get_account_by_auth_identity
    // TODO: add_auth_identity

    pub fn build_account_path(&self, account_id: String, path: String) -> String {
        format!("{}.{}", account_id, path)
    }

    #[payable]
    pub fn send_transaction(&mut self, user_op: UserOp) -> Promise {
        let account = self.accounts.get_mut(&user_op.account_id).unwrap();

        log!("Attached deposit: {}", env::attached_deposit());

        require!(
            account.has_auth_identity(&user_op.auth.auth_identity),
            "Auth identity not found in account"
        );

        let selected_auth_identity = if let Some(selected_auth_identity) = user_op.selected_auth_identity.clone() {
            require!(
                account.has_auth_identity(&selected_auth_identity),
                "Selected auth identity not found in account"
            );
            selected_auth_identity
        } else {
            user_op.auth.auth_identity.clone()
        };

        // TODO: check if the close is needed
        let auth_identity = user_op.auth.auth_identity.clone();
        let payloads = user_op.payloads.clone();
        
        let promise = match auth_identity {
            AuthIdentity::WebAuthn(ref webauthn) => {
                let account = self.accounts.get(&user_op.account_id).unwrap();
                let webauthn_identity = account.auth_identities.iter()
                    .find(|identity| matches!(identity, AuthIdentity::WebAuthn(current_webauthn) if current_webauthn.key_id == webauthn.key_id))
                    .and_then(|identity| {
                        if let AuthIdentity::WebAuthn(webauthn) = identity {
                            Some(webauthn)
                        } else {
                            None
                        }
                    })
                    .expect("WebAuthn identity not found");

                let compressed_public_key = webauthn_identity.compressed_public_key
                    .as_ref()
                    .expect("WebAuthn public key not found");

                match self.handle_webauthn_auth(user_op, compressed_public_key.to_string()) {
                    Ok(promise) => promise,
                    Err(e) => env::panic_str(&e),
            }},
            AuthIdentity::Wallet(wallet) => match wallet.wallet_type {
                WalletType::Ethereum => match self.handle_ethereum_auth(user_op, wallet.public_key.clone()) {
                    Ok(promise) => promise,
                    Err(e) => env::panic_str(&e),
                },
                WalletType::Solana => match self.handle_solana_auth(user_op, wallet.public_key.clone()) {
                    Ok(promise) => promise,
                    Err(e) => env::panic_str(&e),
                },
            },
            AuthIdentity::OIDC(_) => env::panic_str("OIDC auth type not yet implemented"),
            AuthIdentity::Account(_) => env::panic_str("Account auth type not yet supported"),
        };

        promise.then(Self::ext(env::current_account_id()).with_attached_deposit(env::attached_deposit()).send_transaction_callback(selected_auth_identity, payloads))
    }

    #[private]
    #[payable]
    pub fn send_transaction_callback(
        &mut self,
        auth_identity: AuthIdentity,
        payloads: SignPayloadsRequest,
        #[callback_result] auth_result: Result<bool, near_sdk::PromiseError>,
    ) -> Promise {
        match auth_result {
            Ok(true) => match self.execute_transaction(auth_identity, payloads) {
                Ok(promise) => promise,
                Err(e) => env::panic_str(&e),
            },
            Ok(false) => env::panic_str("Authentication failed"),
            Err(_) => env::panic_str("Error validating authentication"),
        }
    }
}
