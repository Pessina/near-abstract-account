use hex;
use interfaces::ethereum_auth::{EthereumData, Signature};
use k256::ecdsa::{RecoveryId, Signature as K256Signature, VerifyingKey};
use near_sdk::{log, near};
use sha3::{Digest, Keccak256};

#[near(contract_state)]
#[derive(Default)]
pub struct EthereumAuthContract {}

#[near]
impl EthereumAuthContract {
    /// Validates an Ethereum signature using k256 (secp256k1) curve
    pub fn validate_eth_signature(&self, eth_data: EthereumData, eth_address: String) -> bool {
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

        let recovered_address = match self.recover_signer(&message_digest, &signature, recovery_id)
        {
            Ok(addr) => addr,
            Err(e) => {
                log!("Failed to recover signer: {}", e);
                return false;
            }
        };

        self.normalize_address(&recovered_address) == self.normalize_address(&eth_address)
    }

    #[inline(always)]
    fn prepare_message(&self, eth_data: &EthereumData) -> Result<Keccak256, String> {
        let mut hasher = Keccak256::new();
        hasher.update(eth_data.message.as_bytes());

        // Prefix and hash again (Ethereum signed message format)
        let prefix = format!("\x19Ethereum Signed Message:\n{}", eth_data.message.len());

        let mut prefix_msg = prefix.as_bytes().to_vec();
        prefix_msg.extend_from_slice(eth_data.message.as_bytes());

        let mut final_hasher = Keccak256::new();
        final_hasher.update(&prefix_msg);
        Ok(final_hasher)
    }

    #[inline(always)]
    fn create_signature(
        &self,
        signature: &Signature,
    ) -> Result<(K256Signature, RecoveryId), String> {
        let r = hex::decode(signature.r.strip_prefix("0x").unwrap_or(&signature.r))
            .map_err(|_| "Invalid hex encoding in r")?;
        let s = hex::decode(signature.s.strip_prefix("0x").unwrap_or(&signature.s))
            .map_err(|_| "Invalid hex encoding in s")?;
        let v = u8::from_str_radix(signature.v.strip_prefix("0x").unwrap_or(&signature.v), 16)
            .map_err(|_| "Invalid v value")?;

        if r.len() != 32 || s.len() != 32 {
            return Err(String::from("Invalid signature length"));
        }

        let mut sig_bytes = [0u8; 64];
        sig_bytes[..32].copy_from_slice(&r);
        sig_bytes[32..].copy_from_slice(&s);

        // Adjust v for modern Ethereum signatures
        let recovery_id = if v >= 27 { v - 27 } else { v };
        let recovery_id =
            RecoveryId::try_from(recovery_id).map_err(|_| String::from("Invalid recovery ID"))?;

        let signature = K256Signature::try_from(sig_bytes.as_slice())
            .map_err(|_| String::from("Invalid signature format"))?;

        Ok((signature, recovery_id))
    }

    #[inline(always)]
    fn recover_signer(
        &self,
        message: &Keccak256,
        signature: &K256Signature,
        recovery_id: RecoveryId,
    ) -> Result<String, String> {
        let verifying_key =
            VerifyingKey::recover_from_digest(message.clone(), signature, recovery_id)
                .map_err(|_| String::from("Failed to recover public key"))?;

        Ok(self.public_key_to_address(&verifying_key))
    }

    #[inline(always)]
    fn public_key_to_address(&self, public_key: &VerifyingKey) -> String {
        let pub_key = public_key.to_encoded_point(false);
        let pub_key_bytes = pub_key.as_bytes();

        let mut hasher = Keccak256::new();
        // Skip the first byte (0x04) which indicates uncompressed public key
        hasher.update(&pub_key_bytes[1..]);
        let hash = hasher.finalize();

        // Take last 20 bytes for address
        format!("0x{}", hex::encode(&hash[12..]))
    }

    #[inline(always)]
    fn normalize_address(&self, address: &str) -> String {
        let addr = address.trim_start_matches("0x").to_lowercase();
        format!("0x{}", addr)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use interfaces::ethereum_auth::{EthereumData, Signature};

    fn get_test_address() -> String {
        "0x4174678c78feafd778c1ff319d5d326701449b25".to_string()
    }

    #[test]
    fn validate_signature_should_succeed() {
        let contract = EthereumAuthContract::default();
        let address = get_test_address();

        let ethereum_data = EthereumData {
            message: r#"{"actions":[{"Transfer":{"deposit":"1000000000000000000000"}},{"FunctionCall":{"args":"{\"request\":{\"path\":\"ethereum,1\",\"payload\":[0,1,2,3,4,5,6,7,8,9,0,1,2,3,4,5,6,7,8,9,0,1,2,3,4,5,6,7,8,9,0,1],\"key_version\":0}}","deposit":"250000000000000000000000","gas":"50000000000000","method_name":"sign"}}],"nonce":"3","receiver_id":"v1.signer-prod.testnet"}"#.to_string(),
            signature: Signature {
                r: "0xb0f8a31ec318104d5545d3ae4f46e1ccb1987e308849f1ed7cfb3847767d1892".to_string(),
                s: "0x7c5bd89fcf288ed7e5b671824af4684297b7884f9dcbf31251d6beb0a4aeca4b".to_string(),
                v: "0x1c".to_string(),
            },
        };

        assert!(contract.validate_eth_signature(ethereum_data, address));
    }

    #[test]
    fn validate_signature_should_fail_with_wrong_address() {
        let contract = EthereumAuthContract::default();
        let wrong_address = "0x1234567890123456789012345678901234567890".to_string();

        let ethereum_data = EthereumData {
            message: r#"{"actions":[{"Transfer":{"deposit":"1000000000000000000000"}},{"FunctionCall":{"args":"{\"request\":{\"path\":\"ethereum,1\",\"payload\":[0,1,2,3,4,5,6,7,8,9,0,1,2,3,4,5,6,7,8,9,0,1,2,3,4,5,6,7,8,9,0,1],\"key_version\":0}}","deposit":"250000000000000000000000","gas":"50000000000000","method_name":"sign"}}],"nonce":"3","receiver_id":"v1.signer-prod.testnet"}"#.to_string(),
            signature: Signature {
                r: "0xb0f8a31ec318104d5545d3ae4f46e1ccb1987e308849f1ed7cfb3847767d1892".to_string(),
                s: "0x7c5bd89fcf288ed7e5b671824af4684297b7884f9dcbf31251d6beb0a4aeca4b".to_string(),
                v: "0x1c".to_string(),
            },
        };

        assert!(!contract.validate_eth_signature(ethereum_data, wrong_address));
    }

    #[test]
    fn validate_signature_should_fail_with_tampered_message() {
        let contract = EthereumAuthContract::default();
        let address = get_test_address();

        let ethereum_data = EthereumData {
            message: r#"{"actions":[{"Transfer":{"deposit":"2000000000000000000000"}},{"FunctionCall":{"args":"{\"request\":{\"path\":\"ethereum,1\",\"payload\":[0,1,2,3,4,5,6,7,8,9,0,1,2,3,4,5,6,7,8,9,0,1,2,3,4,5,6,7,8,9,0,1],\"key_version\":0}}","deposit":"250000000000000000000000","gas":"50000000000000","method_name":"sign"}}],"nonce":"3","receiver_id":"v1.signer-prod.testnet"}"#.to_string(),
            signature: Signature {
                r: "0xb0f8a31ec318104d5545d3ae4f46e1ccb1987e308849f1ed7cfb3847767d1892".to_string(),
                s: "0x7c5bd89fcf288ed7e5b671824af4684297b7884f9dcbf31251d6beb0a4aeca4b".to_string(),
                v: "0x1c".to_string(),
            },
        };

        assert!(!contract.validate_eth_signature(ethereum_data, address));
    }
}
