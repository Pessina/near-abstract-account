use hex;
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
    /// Validates an Ethereum signature using secp256k1 curve
    pub fn validate_eth_signature(&self, eth_data: EthereumData, eth_address: String) -> bool {
        let (message, signature) = match (
            self.prepare_message(&eth_data),
            self.create_signature(&eth_data.signature),
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

        let recovered_address = match self.recover_signer(&message, &signature) {
            Ok(addr) => addr,
            Err(e) => {
                log!("Failed to recover signer: {}", e);
                return false;
            }
        };

        self.normalize_address(&recovered_address) == self.normalize_address(&eth_address)
    }

    #[inline(always)]
    fn prepare_message(&self, eth_data: &EthereumData) -> Result<Message, String> {
        let mut hasher = Keccak256::new();
        hasher.update(eth_data.message.as_bytes());
        let message_hash = hasher.finalize();

        // Prefix and hash again (Ethereum signed message format)
        let mut prefix_msg = format!("\x19Ethereum Signed Message:\n{}", eth_data.message.len())
            .as_bytes()
            .to_vec();
        prefix_msg.extend_from_slice(&message_hash);

        let mut final_hasher = Keccak256::new();
        final_hasher.update(&prefix_msg);
        let final_hash = final_hasher.finalize();

        Message::from_slice(&final_hash).map_err(|_| String::from("Invalid message format"))
    }

    #[inline(always)]
    fn create_signature(&self, signature: &Signature) -> Result<RecoverableSignature, String> {
        let r = hex::decode(signature.r.strip_prefix("0x").unwrap_or(&signature.r))
            .map_err(|_| "Invalid hex encoding in r")?;
        let s = hex::decode(signature.s.strip_prefix("0x").unwrap_or(&signature.s))
            .map_err(|_| "Invalid hex encoding in s")?;
        let v = signature
            .v
            .strip_prefix("0x")
            .unwrap_or(&signature.v)
            .parse::<u8>()
            .map_err(|_| "Invalid v value")?;

        if r.len() != 32 || s.len() != 32 {
            return Err(String::from("Invalid signature length"));
        }

        let mut sig_bytes = [0u8; 64];
        sig_bytes[..32].copy_from_slice(&r);
        sig_bytes[32..].copy_from_slice(&s);

        // Adjust v for modern Ethereum signatures
        let recovery_id = if v >= 27 { v - 27 } else { v };

        let recovery_id = RecoveryId::try_from(recovery_id as i32)
            .map_err(|_| String::from("Invalid recovery ID"))?;

        RecoverableSignature::from_compact(&sig_bytes, recovery_id)
            .map_err(|_| String::from("Invalid signature format"))
    }

    #[inline(always)]
    fn recover_signer(
        &self,
        message: &Message,
        signature: &RecoverableSignature,
    ) -> Result<String, String> {
        let secp = Secp256k1::verification_only();
        let public_key = secp
            .recover_ecdsa(message, signature)
            .map_err(|_| String::from("Failed to recover public key"))?;

        Ok(self.public_key_to_address(&public_key))
    }

    #[inline(always)]
    fn public_key_to_address(&self, public_key: &PublicKey) -> String {
        let pub_key = public_key.serialize_uncompressed();
        let mut hasher = Keccak256::new();
        // Skip the first byte (0x04) which indicates uncompressed public key
        hasher.update(&pub_key[1..]);
        let hash = hasher.finalize();
        // Take last 20 bytes for address
        format!("0x{}", hex::encode(&hash[12..]))
    }

    #[inline(always)]
    fn normalize_address(&self, address: &str) -> String {
        address.to_lowercase()
    }
}
