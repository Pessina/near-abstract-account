use interfaces::ethereum_auth::{EthereumData, Signature};
use near_sdk::{log, near};
use secp256k1::{
    ecdsa::{RecoverableSignature, RecoveryId},
    Message, PublicKey, Secp256k1,
};
use sha3::{Digest, Keccak256};

#[near(contract_state)]
pub struct EthereumAuthContract {}

impl Default for EthereumAuthContract {
    fn default() -> Self {
        Self {}
    }
}

#[near]
impl EthereumAuthContract {
    /// Validates an Ethereum signature for a signed message
    pub fn validate_ethereum_signature(
        &self,
        ethereum_data: EthereumData,
        public_address: String,
    ) -> bool {
        let (message, signature) = match (
            self.prepare_message(&ethereum_data),
            self.create_signature(&ethereum_data.signature),
        ) {
            (Ok(msg), Ok(sig)) => (msg, sig),
            (Err(e), _) => {
                log!("Failed to prepare message: {}", e);
                return false;
            }
            (_, Err(e)) => {
                log!("Failed to create signature: {}", e);
                return false;
            }
        };

        // Recover the public key and verify it matches
        let secp = Secp256k1::new();
        match secp.recover(&message, &signature) {
            Ok(recovered_key) => {
                let recovered_address = public_key_to_address(&recovered_key);
                recovered_address.eq_ignore_ascii_case(&public_address)
            }
            Err(e) => {
                log!("Failed to recover public key: {}", e);
                false
            }
        }
    }

    #[inline(always)]
    fn prepare_message(&self, ethereum_data: &EthereumData) -> Result<Message, String> {
        // Prepare the Ethereum signed message format
        let message = format!(
            "\x19Ethereum Signed Message:\n{}{}",
            ethereum_data.message.len(),
            ethereum_data.message
        );

        // Hash the message
        let mut hasher = Keccak256::new();
        hasher.update(message.as_bytes());
        let message_hash = hasher.finalize();

        Message::from_slice(&message_hash)
            .map_err(|_| String::from("Failed to create message from hash"))
    }

    #[inline(always)]
    fn create_signature(&self, signature: &Signature) -> Result<RecoverableSignature, String> {
        let r_bytes = hex::decode(signature.r.strip_prefix("0x").unwrap_or(&signature.r))
            .map_err(|_| "Invalid hex encoding in signature r component")?;
        let s_bytes = hex::decode(signature.s.strip_prefix("0x").unwrap_or(&signature.s))
            .map_err(|_| "Invalid hex encoding in signature s component")?;
        let v_str = signature.v.strip_prefix("0x").unwrap_or(&signature.v);
        let v_num = u64::from_str_radix(v_str, 16)
            .or_else(|_| signature.v.parse::<u64>())
            .map_err(|_| "Invalid encoding in signature v component")?;

        // Ensure r and s are 32 bytes each
        if r_bytes.len() != 32 || s_bytes.len() != 32 {
            return Err("Invalid length of r or s".into());
        }

        // Compute recovery ID
        let recovery_id = match v_num {
            27 | 28 => (v_num - 27) as u8,
            0 | 1 => v_num as u8,
            v if v >= 35 => ((v - 35) % 2) as u8,
            _ => return Err("Invalid recovery id (v)".into()),
        };

        // Combine r and s into a 64-byte array
        let mut sig_bytes = [0u8; 64];
        sig_bytes[..32].copy_from_slice(&r_bytes);
        sig_bytes[32..].copy_from_slice(&s_bytes);

        // Create RecoverableSignature
        let rec_id = RecoveryId::from_i32(recovery_id as i32)
            .map_err(|_| "Invalid recovery id".to_string())?;
        let recoverable_signature = RecoverableSignature::from_compact(&sig_bytes, rec_id)
            .map_err(|_| "Invalid signature format".to_string())?;

        Ok(recoverable_signature)
    }
}

fn public_key_to_address(public_key: &PublicKey) -> String {
    let public_key = public_key.serialize_uncompressed();

    // Remove the first byte (0x04) which indicates uncompressed public key
    let mut hasher = Keccak256::new();
    hasher.update(&public_key[1..]);
    let hash = hasher.finalize();

    // Take last 20 bytes to get Ethereum address
    format!("0x{}", hex::encode(&hash[12..]))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[derive(Debug)]
    pub struct EthereumData {
        pub message: String,
        pub signature: Signature,
    }

    #[derive(Debug)]
    pub struct Signature {
        pub r: String,
        pub s: String,
        pub v: String,
    }

    #[test]
    fn validate_signature_should_succeed() {
        let contract = EthereumAuthContract::default();
        let ethereum_data = EthereumData {
            message: "Hello World".to_string(),
            signature: Signature {
                r: "28a2cec67b3c7d12351101f9b7a7baddf8d1d0b5d8dec03547c16356644f0c1a".to_string(),
                s: "1ad7aa7bd9f605fa241a34c3c6c8c37f099c5c4c0cc84b99c8a986d839725529".to_string(),
                v: "1c".to_string(),
            },
        };
        let public_address = "0x71C7656EC7ab88b098defB751B7401B5f6d8976F".to_string();

        assert!(contract.validate_ethereum_signature(ethereum_data, public_address));
    }

    #[test]
    fn validate_signature_should_fail() {
        let contract = EthereumAuthContract::default();
        let ethereum_data = EthereumData {
            message: "Hello World".to_string(),
            signature: Signature {
                r: "28a2cec67b3c7d12351101f9b7a7baddf8d1d0b5d8dec03547c16356644f0c1a".to_string(),
                s: "1ad7aa7bd9f605fa241a34c3c6c8c37f099c5c4c0cc84b99c8a986d839725529".to_string(),
                v: "1c".to_string(),
            },
        };
        let wrong_address = "0x63FaC9201494f0bd17B9892B9fae4d52fe3BD377".to_string();

        assert!(!contract.validate_ethereum_signature(ethereum_data, wrong_address));
    }
}
