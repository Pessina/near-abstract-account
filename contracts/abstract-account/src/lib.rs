mod contract;
mod mods;
mod types;
mod utils;

use interfaces::auth::wallet::WalletType;
use near_sdk::{
    env, near, require,
    serde::{Deserialize, Serialize},
    store::IterableMap,
    AccountId, Promise,
};
use near_sdk_contract_tools::Nep145;
use schemars::JsonSchema;
use types::{
    account::Account,
    auth_identity::AuthIdentity,
    transaction::{Transaction, UserOp},
};
use types::{auth_identity::AuthIdentityNames, transaction::Action};
use utils::utils::{extract_credentials, get_signed_message};

const KEY_PREFIX_ACCOUNTS: &[u8] = b"q";
const KEY_PREFIX_AUTH_CONTRACTS: &[u8] = b"a";

#[derive(Nep145)]
#[near(contract_state)]
pub struct AbstractAccountContract {
    accounts: IterableMap<String, Account>,
    auth_contracts: IterableMap<AuthIdentityNames, AccountId>,
    signer_account: AccountId,
    /*
    Tracks the maximum nonce of the accounts deleted.

    When an account is deleted and recreated, its nonce would normally reset to 0.
    This would allow previously used signatures (with nonces 0 through N) to be
    replayed on the new account.

    By tracking the global maximum nonce, we ensure that even recreated accounts
    start with the max_nonce avoiding replay attacks.
    */
    max_nonce: u128,
}

#[derive(Deserialize, Serialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct AuthContractConfig {
    pub auth_type: AuthIdentityNames,
    pub contract_id: String,
}

impl Default for AbstractAccountContract {
    fn default() -> Self {
        Self {
            accounts: IterableMap::new(KEY_PREFIX_ACCOUNTS),
            auth_contracts: IterableMap::new(KEY_PREFIX_AUTH_CONTRACTS),
            signer_account: env::current_account_id(),
            max_nonce: 0,
        }
    }
}

#[near]
impl AbstractAccountContract {
    #[init]
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

    #[payable]
    pub fn auth(&mut self, user_op: UserOp) -> Promise {
        let predecessor = env::predecessor_account_id();
        let account_id = user_op.transaction.account_id.clone();
        let account = self.accounts.get(&account_id).unwrap();

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

        let transaction = user_op.transaction;
        let signed_message = get_signed_message(&transaction);

        let promise = match user_op.auth.authenticator {
            AuthIdentity::WebAuthn(ref webauthn) => {
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

                // TODO: Temporary disable using selected auth identity for passkeys
                // if let AuthIdentity::WebAuthn(ref mut webauthn) = selected_auth_identity {
                //     webauthn.compressed_public_key = Some(compressed_public_key.to_string());
                // }

                let credentials = extract_credentials(&user_op.auth.credentials);

                self.handle_webauthn_auth(
                    credentials,
                    signed_message,
                    compressed_public_key.to_string(),
                )
            }
            AuthIdentity::Wallet(wallet) => {
                let auth_identity_name = match wallet.wallet_type {
                    WalletType::Ethereum => AuthIdentityNames::EthereumWallet,
                    WalletType::Solana => AuthIdentityNames::SolanaWallet,
                };

                let credentials = extract_credentials(&user_op.auth.credentials);

                self.handle_wallet_auth(
                    credentials,
                    signed_message,
                    wallet.public_key.clone(),
                    auth_identity_name,
                )
            }
            AuthIdentity::OIDC(oidc) => {
                let credentials = extract_credentials(&user_op.auth.credentials);

                self.handle_oidc_auth(credentials, signed_message, oidc)
            }
            AuthIdentity::Account(_) => env::panic_str("Account auth type not yet supported"),
        };

        promise.then(
            Self::ext(env::current_account_id())
                .with_attached_deposit(env::attached_deposit())
                .auth_callback(account_id, selected_auth_identity, transaction, predecessor),
        )
    }

    #[payable]
    #[private]
    pub fn auth_callback(
        &mut self,
        account_id: String,
        auth_identity: AuthIdentity,
        transaction: Transaction,
        predecessor: AccountId,
        #[callback_result] auth_result: Result<bool, near_sdk::PromiseError>,
    ) -> Option<Promise> {
        match auth_result {
            Ok(true) => {
                match transaction.action {
                    Action::Sign(sign_payloads_request) => {
                        return Some(self.sign(auth_identity, sign_payloads_request));
                    }
                    operation @ (Action::RemoveAccount
                    | Action::AddAuthIdentity(_)
                    | Action::RemoveAuthIdentity(_)) => {
                        self.handle_account_operation(predecessor, account_id, operation);
                    }
                };

                None
            }
            Ok(false) => env::panic_str("Authentication failed"),
            Err(_) => env::panic_str("Error validating authentication"),
        }
    }
}
