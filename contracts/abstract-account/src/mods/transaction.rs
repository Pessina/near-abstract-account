use std::str::FromStr;

use crate::AbstractAccountContract;
use near_sdk::{
    serde::{Deserialize, Serialize},
    AccountId, Gas, NearToken, Promise,
};
use schemars::JsonSchema;

// TODO: Those types should be imported from near libs and we should also find a way to automatically convert them to u64 and u128, without using parse.
type FunctionCallGas = String; // u64;
type Balance = String; // u128;
type Args = String; // Vec<u8>: Base64
type Nonce = String; // u64

#[derive(Deserialize, Serialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct FunctionCallAction {
    pub method_name: String,
    pub args: Args,
    pub gas: FunctionCallGas,
    pub deposit: Balance,
}

#[derive(Deserialize, Serialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct TransferAction {
    pub deposit: Balance,
}

#[derive(Deserialize, Serialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub enum Action {
    Transfer(TransferAction),
    FunctionCall(FunctionCallAction),
}

#[derive(Deserialize, Serialize, JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct Transaction {
    pub nonce: Nonce,
    pub receiver_id: String,
    pub actions: Vec<Action>,
}

impl AbstractAccountContract {
    pub fn execute_transaction(&self, transaction: Transaction) -> Result<Promise, String> {
        let receiver_id = AccountId::from_str(&transaction.receiver_id)
            .map_err(|_| "Invalid receiver account ID")?;

        let mut promise = Promise::new(receiver_id);

        for action in transaction.actions {
            match action {
                Action::Transfer(transfer) => {
                    let amount = transfer
                        .deposit
                        .parse::<u128>()
                        .map_err(|_| "Invalid transfer amount")?;
                    promise = promise.transfer(NearToken::from_yoctonear(amount));
                }
                Action::FunctionCall(function_call) => {
                    let deposit = function_call
                        .deposit
                        .parse::<u128>()
                        .map_err(|_| "Invalid function call deposit")?;
                    let gas = function_call
                        .gas
                        .parse::<u64>()
                        .map_err(|_| "Invalid gas amount")?;
                    promise = promise.function_call(
                        function_call.method_name,
                        function_call.args.as_bytes().to_vec(),
                        NearToken::from_yoctonear(deposit),
                        Gas::from_gas(gas),
                    );
                }
            }
        }
        Ok(promise)
    }
}
