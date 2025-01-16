mod contract_account;
mod mods;
mod types;

use interfaces::auth::wallet::WalletType;
use mods::transaction::SignPayloadsRequest;
use near_sdk::{
    env, near, require,
    serde::{Deserialize, Serialize},
    store::{IterableMap, LookupMap},
    AccountId, Promise,
};
use schemars::JsonSchema;
use types::auth_identity::AuthIdentityNames;
use types::{account::Account, auth_identity::AuthIdentity, transaction::UserOp};

const KEY_PREFIX_ACCOUNTS: &[u8] = b"q";
const KEY_PREFIX_AUTH_CONTRACTS: &[u8] = b"a";

#[near(contract_state)]
pub struct AbstractAccountContract {
    owner: AccountId,
    accounts: IterableMap<String, Account>, // account_id -> account (auth_identities)
    auth_contracts: LookupMap<AuthIdentityNames, AccountId>,
    signer_account: AccountId,
}

impl Default for AbstractAccountContract {
    fn default() -> Self {
        let mut auth_contracts = LookupMap::new(KEY_PREFIX_AUTH_CONTRACTS);
        auth_contracts.insert(
            AuthIdentityNames::WebAuthn,
            "felipe-webauthn-contract.testnet".parse().unwrap(),
        );
        auth_contracts.insert(
            AuthIdentityNames::EthereumWallet,
            "felipe-ethereum-contract.testnet".parse().unwrap(),
        );
        auth_contracts.insert(
            AuthIdentityNames::SolanaWallet,
            "felipe-solana-contract.testnet".parse().unwrap(),
        );
        auth_contracts.insert(
            AuthIdentityNames::OIDC,
            "felipe-oidc-contract.testnet".parse().unwrap(),
        );

        Self {
            accounts: IterableMap::new(KEY_PREFIX_ACCOUNTS),
            owner: env::predecessor_account_id(),
            auth_contracts,
            signer_account: "v1.signer-prod.testnet".parse().unwrap(),
        }
    }
}

#[derive(Deserialize, Serialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct AuthContractConfig {
    pub auth_type: AuthIdentityNames,
    pub contract_id: String,
}

#[near]
impl AbstractAccountContract {
    #[init(ignore_state)]
    pub fn new(
        auth_contracts: Option<Vec<AuthContractConfig>>,
        signer_account: Option<String>,
    ) -> Self {
        let mut contract = Self::default();

        if let Some(contracts) = auth_contracts {
            for contract_config in contracts {
                contract.auth_contracts.insert(
                    contract_config.auth_type,
                    contract_config.contract_id.parse().unwrap(),
                );
            }
        }

        if let Some(signer) = signer_account {
            contract.signer_account = signer.parse().unwrap();
        }

        contract
    }

    // TODO: get_account_by_auth_identity

    pub fn build_account_path(&self, account_id: String, path: String) -> String {
        format!("{},{}", account_id, path)
    }

    // TODO: it should be auth function that check the auth identity and then call the send_transaction, add_auth_identity, delete_auth_identity
    #[payable]
    pub fn send_transaction(&mut self, user_op: UserOp) -> Promise {
        let account = self.accounts.get_mut(&user_op.account_id).unwrap();

        require!(
            account.has_auth_identity(&user_op.auth.authenticator),
            "Auth identity not found in account"
        );

        let selected_auth_identity =
            if let Some(selected_auth_identity) = user_op.selected_auth_identity.clone() {
                require!(
                    account.has_auth_identity(&selected_auth_identity),
                    "Selected auth identity not found in account"
                );
                selected_auth_identity
            } else {
                user_op.auth.authenticator.clone()
            };

        // TODO: check if the clone is needed
        let auth_identity = user_op.auth.authenticator.clone();
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

                let compressed_public_key = webauthn_identity
                    .compressed_public_key
                    .as_ref()
                    .expect("WebAuthn public key not found");

                match self.handle_webauthn_auth(user_op, compressed_public_key.to_string()) {
                    Ok(promise) => promise,
                    Err(e) => env::panic_str(&e),
                }
            }
            AuthIdentity::Wallet(wallet) => match wallet.wallet_type {
                WalletType::Ethereum => {
                    match self.handle_wallet_auth(
                        user_op,
                        wallet.public_key.clone(),
                        AuthIdentityNames::EthereumWallet,
                    ) {
                        Ok(promise) => promise,
                        Err(e) => env::panic_str(&e),
                    }
                }
                WalletType::Solana => {
                    match self.handle_wallet_auth(
                        user_op,
                        wallet.public_key.clone(),
                        AuthIdentityNames::SolanaWallet,
                    ) {
                        Ok(promise) => promise,
                        Err(e) => env::panic_str(&e),
                    }
                }
            },
            AuthIdentity::OIDC(oidc) => match self.handle_oidc_auth(user_op, oidc) {
                Ok(promise) => promise,
                Err(e) => env::panic_str(&e),
            },
            AuthIdentity::Account(_) => env::panic_str("Account auth type not yet supported"),
        };

        promise.then(
            Self::ext(env::current_account_id())
                .with_attached_deposit(env::attached_deposit())
                .send_transaction_callback(selected_auth_identity, payloads),
        )
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
