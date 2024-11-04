use bs58;
use ed25519_dalek::{Signature, VerifyingKey};
use interfaces::solana_auth::SolanaData;
use near_sdk::{env, near_bindgen};

#[near_bindgen]
#[derive(Default)]
pub struct SolanaAuthContract {}

#[near_bindgen]
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
        let sig_bytes = bs58::decode(signature)
            .into_vec()
            .map_err(|_| "Invalid base58 encoding in signature")?;

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
        "DxPv2QMA5cW8TV8tGwwAT5Ty3JBwvp6P5HKSiduoUQBB".to_string()
    }

    #[test]
    fn validate_signature_should_succeed() {
        let contract = SolanaAuthContract::default();
        let public_key = get_test_public_key();

        let solana_data = SolanaData {
            message: "Test message".to_string(),
            signature: "4vV3MkdgmaCHQZvdqFiAtvhQk8GCLjNBgz9mw9PYaGBqTZ9hZiHBvbKQk9ZaX8HB3nF2kzSbVXgL2uVyiuZ6MpZc".to_string(),
        };

        assert!(contract.validate_solana_signature(solana_data, public_key));
    }

    #[test]
    fn validate_signature_should_fail_with_wrong_public_key() {
        let contract = SolanaAuthContract::default();
        let wrong_public_key = "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin".to_string();

        let solana_data = SolanaData {
            message: "Test message".to_string(),
            signature: "4vV3MkdgmaCHQZvdqFiAtvhQk8GCLjNBgz9mw9PYaGBqTZ9hZiHBvbKQk9ZaX8HB3nF2kzSbVXgL2uVyiuZ6MpZc".to_string(),
        };

        assert!(!contract.validate_solana_signature(solana_data, wrong_public_key));
    }

    #[test]
    fn validate_signature_should_fail_with_tampered_message() {
        let contract = SolanaAuthContract::default();
        let public_key = get_test_public_key();

        let solana_data = SolanaData {
            message: "Tampered message".to_string(),
            signature: "4vV3MkdgmaCHQZvdqFiAtvhQk8GCLjNBgz9mw9PYaGBqTZ9hZiHBvbKQk9ZaX8HB3nF2kzSbVXgL2uVyiuZ6MpZc".to_string(),
        };

        assert!(!contract.validate_solana_signature(solana_data, public_key));
    }
}
