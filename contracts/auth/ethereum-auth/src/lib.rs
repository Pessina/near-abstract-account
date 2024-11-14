use hex;
use interfaces::ethereum_auth::EthereumData;
use k256::ecdsa::{RecoveryId, Signature as K256Signature, VerifyingKey};
use near_sdk::{log, near, require};
use sha3::{Digest, Keccak256};

#[near(contract_state)]
#[derive(Default)]
pub struct EthereumAuthContract {}

#[near]
impl EthereumAuthContract {
    /// Validates an Ethereum signature using k256 (secp256k1) curve
    pub fn validate_eth_signature(&self, eth_data: EthereumData, compressed_public_key: String) -> bool {
        let (message_digest, signature, recovery_id) = match (
            self.prepare_message(&eth_data),
            self.create_signature(&eth_data.signature),
        ) {
            (Ok(msg), Ok((sig, rec_id))) => (msg, sig, rec_id),
            (Err(e), _) => {
                log!("Failed to prepare message: {}", e);
                return false;
            }
            (_, Err(e)) => {
                log!("Failed to create signature: {}", e);
                return false;
            }
        };

        let recovered_public_key = match self.recover_public_key(&message_digest, &signature, recovery_id) {
            Ok(key) => key,
            Err(e) => {
                log!("Failed to recover public key: {}", e);
                return false;
            }
        };

        self.normalize_key(&recovered_public_key) == self.normalize_key(&compressed_public_key)
    }

    #[inline(always)]
    fn normalize_key(&self, key: &str) -> String {
        key.strip_prefix("0x")
            .unwrap_or(key)
            .to_ascii_lowercase()
    }

    #[inline(always)]
    fn prepare_message(&self, eth_data: &EthereumData) -> Result<Keccak256, String> {
        let message_len = eth_data.message.len();
        let prefix = format!("\x19Ethereum Signed Message:\n{message_len}");

        let mut hasher = Keccak256::new();
        hasher.update(prefix.as_bytes());
        hasher.update(eth_data.message.as_bytes());
        
        Ok(hasher)
    }

    #[inline(always)]
    fn create_signature(
        &self,
        signature: &str,
    ) -> Result<(K256Signature, RecoveryId), String> {
        let sig_bytes = hex::decode(signature.strip_prefix("0x").unwrap_or(signature))
            .map_err(|_| "Invalid hex encoding in signature")?;

        require!(sig_bytes.len() == 65, "Invalid signature length - expected 65 bytes");

        let (r_s_bytes, v_byte) = sig_bytes.split_at(64);
        let v = v_byte[0];

        let signature = K256Signature::try_from(r_s_bytes)
            .map_err(|_| "Invalid signature format")?;

        let recovery_id = RecoveryId::try_from(if v >= 27 { v - 27 } else { v })
            .map_err(|_| "Invalid recovery ID")?;

        Ok((signature, recovery_id))
    }

    #[inline(always)]
    fn recover_public_key(
        &self,
        message: &Keccak256,
        signature: &K256Signature,
        recovery_id: RecoveryId,
    ) -> Result<String, String> {
        VerifyingKey::recover_from_digest(message.clone(), signature, recovery_id)
            .map(|key| key.to_encoded_point(true).to_string())
            .map_err(|_| "Failed to recover public key".into())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use interfaces::ethereum_auth::EthereumData;

    fn get_compressed_public_key() -> String {
        "0x0304ab3cb2897344aa3f6ffaac94e477aeac170b9235d2416203e2a72bc9b8a7c7".to_string()
    }

    #[test]
    fn validate_signature_should_succeed() {
        let contract = EthereumAuthContract::default();
        let compressed_public_key = get_compressed_public_key();

        let ethereum_data = EthereumData {
            message: r#"{"actions":[{"Transfer":{"deposit":"10000000000000000000"}}],"nonce":"4","receiver_id":"felipe-sandbox-account.testnet"}"#.to_string(),
            signature: "0x1413a2cc33c3ad9a150de47566c098c7f0a3f3236767ae80cfb3dcef1447d5ad1850f86f1161a5cc3620dcd8a0675f5e7ccf76f5772bb3af6ed6ea6e4ee05d111b".to_string(),
        };

        assert!(contract.validate_eth_signature(ethereum_data, compressed_public_key));
    }

    #[test]
    fn validate_signature_should_fail_with_wrong_address() {
        let contract = EthereumAuthContract::default();
        let wrong_compressed_public_key = "0x0314ab3cb2897344aa3f6ffaac94e477aeac170b9235d2416203e2a72bc9b8a7c7".to_string();

        let ethereum_data = EthereumData {
            message: r#"{"actions":[{"Transfer":{"deposit":"10000000000000000000"}}],"nonce":"4","receiver_id":"felipe-sandbox-account.testnet"}"#.to_string(),
            signature: "0x1413a2cc33c3ad9a150de47566c098c7f0a3f3236767ae80cfb3dcef1447d5ad1850f86f1161a5cc3620dcd8a0675f5e7ccf76f5772bb3af6ed6ea6e4ee05d111b".to_string(),
        };

        assert!(!contract.validate_eth_signature(ethereum_data, wrong_compressed_public_key));
    }

    #[test]
    fn validate_signature_should_fail_with_tampered_message() {
        let contract = EthereumAuthContract::default();
        let address = get_compressed_public_key();

        let ethereum_data = EthereumData {
            message: r#"{"actions":[{"Transfer":{"deposit":"10000000000000000000"}}],"nonce":"4","receiver_id":"felipe-sandbox-account.testnet"}"#.to_string(),
            signature: "0x1413a2cc33c3ad9a150de47566c098c7f0a3f3236767ae80cfb3dcef1447d5ad1850f86f1161a5cc3620dcd8a0675f5e7ccf76f5772bb3af6ed6ea6e4ee05d121b".to_string(),            
        };

        assert!(!contract.validate_eth_signature(ethereum_data, address));
    }
}
