use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use bs58;
use ed25519_dalek::{Signature, VerifyingKey};
use interfaces::solana_auth::SolanaData;
use near_sdk::{env, near};

#[near(contract_state)]
#[derive(Default)]
pub struct SolanaAuthContract {}

#[near]
impl SolanaAuthContract {
    /// Validates a Solana signature using ed25519 curve
    pub fn validate_solana_signature(&self, solana_data: SolanaData, public_key: String) -> bool {
        let (verifying_key, message, signature) = match (
            self.create_verifying_key(&public_key),
            self.prepare_message(&solana_data.message),
            self.create_signature(&solana_data.signature),
        ) {
            (Ok(key), Ok(msg), Ok(sig)) => (key, msg, sig),
            (Err(e), _, _) => {
                env::log_str(&format!("Failed to create verifying key: {}", e));
                return false;
            }
            (_, Err(e), _) => {
                env::log_str(&format!("Failed to prepare message: {}", e));
                return false;
            }
            (_, _, Err(e)) => {
                env::log_str(&format!("Failed to create signature: {}", e));
                return false;
            }
        };

        verifying_key.verify_strict(&message, &signature).is_ok()
    }

    #[inline(always)]
    fn create_verifying_key(&self, public_key: &str) -> Result<VerifyingKey, String> {
        let decoded = bs58::decode(public_key)
            .into_vec()
            .map_err(|_| "Invalid base58 encoding in public key")?;

        VerifyingKey::from_bytes(
            decoded
                .as_slice()
                .try_into()
                .map_err(|_| "Invalid public key length")?,
        )
        .map_err(|_| String::from("Invalid public key format"))
    }

    #[inline(always)]
    fn prepare_message(&self, message: &str) -> Result<Vec<u8>, String> {
        Ok(message.as_bytes().to_vec())
    }

    #[inline(always)]
    fn create_signature(&self, signature: &str) -> Result<Signature, String> {
        let sig_bytes = STANDARD
            .decode(signature)
            .map_err(|_| "Invalid base64 encoding in signature")?;

        Ok(Signature::from_bytes(
            sig_bytes
                .as_slice()
                .try_into()
                .map_err(|_| "Invalid signature length")?,
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use interfaces::solana_auth::SolanaData;

    fn get_test_public_key() -> String {
        "4yrrTFWWVUdbr1AZz9o7D4CfRmZThTqtfzyQ7KojUb8u".to_string()
    }

    #[test]
    fn validate_signature_should_succeed() {
        let contract = SolanaAuthContract::default();
        let public_key = get_test_public_key();

        let solana_data = SolanaData {
            message: "{\"actions\":[{\"Transfer\":{\"deposit\":\"1000000000000000000000\"}},{\"FunctionCall\":{\"args\":\"{\\\"request\\\":{\\\"path\\\":\\\"ethereum,1\\\",\\\"payload\\\":[0,1,2,3,4,5,6,7,8,9,0,1,2,3,4,5,6,7,8,9,0,1,2,3,4,5,6,7,8,9,0,1],\\\"key_version\\\":0}}\",\"deposit\":\"250000000000000000000000\",\"gas\":\"50000000000000\",\"method_name\":\"sign\"}}],\"nonce\":\"9\",\"receiver_id\":\"v1.signer-prod.testnet\"}".to_string(),
            signature: "hMqxC3gElo4ZvXrk/k24qoTO2fLVF6Vr1lMoCI8l/SucxAt82TgYBfbYu1ovYKtYxY9GTwH1+168oZMTLGjBBw==".to_string(),
        };

        assert!(contract.validate_solana_signature(solana_data, public_key));
    }

    #[test]
    fn validate_signature_should_fail_with_wrong_public_key() {
        let contract = SolanaAuthContract::default();
        let wrong_public_key = "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin".to_string();

        let solana_data = SolanaData {
            message: "{\"actions\":[{\"Transfer\":{\"deposit\":\"1000000000000000000000\"}},{\"FunctionCall\":{\"args\":\"{\\\"request\\\":{\\\"path\\\":\\\"ethereum,1\\\",\\\"payload\\\":[0,1,2,3,4,5,6,7,8,9,0,1,2,3,4,5,6,7,8,9,0,1,2,3,4,5,6,7,8,9,0,1],\\\"key_version\\\":0}}\",\"deposit\":\"250000000000000000000000\",\"gas\":\"50000000000000\",\"method_name\":\"sign\"}}],\"nonce\":\"9\",\"receiver_id\":\"v1.signer-prod.testnet\"}".to_string(),
            signature: "hMqxC3gElo4ZvXrk/k24qoTO2fLVF6Vr1lMoCI8l/SucxAt82TgYBfbYu1ovYKtYxY9GTwH1+168oZMTLGjBBw==".to_string(),
        };

        assert!(!contract.validate_solana_signature(solana_data, wrong_public_key));
    }

    #[test]
    fn validate_signature_should_fail_with_tampered_message() {
        let contract = SolanaAuthContract::default();
        let public_key = get_test_public_key();

        let solana_data = SolanaData {
            message: "Tampered message".to_string(),
            signature: "hMqxC3gElo4ZvXrk/k24qoTO2fLVF6Vr1lMoCI8l/SucxAt82TgYBfbYu1ovYKtYxY9GTwH1+168oZMTLGjBBw==".to_string(),
        };

        assert!(!contract.validate_solana_signature(solana_data, public_key));
    }
}
