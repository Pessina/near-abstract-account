mod contract;
mod mods;
mod types;
mod utils;

use interfaces::{auth::wallet::WalletType, traits::signable_message::SignableMessage};
use near_sdk::{
    env, near,
    serde::{Deserialize, Serialize},
    store::IterableMap,
    AccountId, Promise,
};
use near_sdk_contract_tools::Nep145;
use schemars::JsonSchema;
use types::{
    account::Account,
    identity::{Identity, IdentityWithPermissions},
    transaction::{Transaction, UserOp},
};
use types::{identity::AuthTypeNames, transaction::Action};

const KEY_PREFIX_ACCOUNTS: &[u8] = b"q";
const KEY_PREFIX_AUTH_CONTRACTS: &[u8] = b"a";

#[derive(Nep145)]
#[near(contract_state)]
pub struct AbstractAccountContract {
    accounts: IterableMap<String, Account>,
    auth_contracts: IterableMap<AuthTypeNames, AccountId>,
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
    pub auth_type: AuthTypeNames,
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
    pub fn new(auth_contracts: Vec<AuthContractConfig>, signer_account: String) -> Self {
        let mut contract = Self::default();

        for contract_config in auth_contracts {
            contract.auth_contracts.insert(
                contract_config.auth_type,
                contract_config.contract_id.parse().unwrap(),
            );
        }

        contract.signer_account = signer_account.parse().unwrap();

        contract
    }

    #[payable]
    pub fn auth(&mut self, user_op: UserOp) -> Promise {
        let predecessor = env::predecessor_account_id();
        self.validate_permission_and_account(&user_op);

        let account_id = user_op.transaction.account_id.clone();
        let account = self.accounts.get_mut(&account_id).unwrap();

        account.nonce += 1;

        let mut identity = user_op.auth.identity.clone();
        identity.inject_webauthn_compressed_public_key(account);

        let act_as = if let Some(act_as) = user_op.act_as {
            act_as
        } else {
            identity.clone()
        };

        let transaction = user_op.transaction;
        let signed_message = transaction.to_signed_message(());

        self.validate_credentials(
            identity,
            user_op.auth.credentials,
            signed_message,
            Self::ext(env::current_account_id())
                .with_attached_deposit(env::attached_deposit())
                .auth_callback(account_id, act_as, transaction, predecessor),
        )
    }

    #[payable]
    #[private]
    pub fn auth_callback(
        &mut self,
        account_id: String,
        identity: Identity,
        transaction: Transaction,
        predecessor: AccountId,
        #[callback_result] auth_result: Result<bool, near_sdk::PromiseError>,
    ) -> Option<Promise> {
        match auth_result {
            Ok(true) => {
                match transaction.action {
                    Action::Sign(sign_payloads_request) => {
                        return Some(self.sign(identity, sign_payloads_request));
                    }
                    action @ (Action::RemoveAccount
                    | Action::AddIdentity(_)
                    | Action::AddIdentityWithAuth(_)
                    | Action::RemoveIdentity(_)) => {
                        self.handle_account_action(predecessor, account_id, action);
                    }
                };

                None
            }
            Ok(false) => env::panic_str("Authentication failed"),
            Err(_) => env::panic_str("Error validating authentication"),
        }
    }
}
