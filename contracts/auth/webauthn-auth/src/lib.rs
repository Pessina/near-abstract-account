use hex;
use interfaces::webauthn_auth::WebAuthnData;
use near_sdk::{log, near};
use p256::{
    ecdsa::{signature::Verifier, Signature as P256Signature, VerifyingKey},
    elliptic_curve::sec1::ToEncodedPoint,
    PublicKey as P256PublicKey,
};
use sha2::{Digest, Sha256};

#[near(contract_state)]
#[derive(Default)]
pub struct WebAuthnAuthContract {}

#[near]
impl WebAuthnAuthContract {
    /// Validates a WebAuthn passkey signature using the P-256 elliptic curve.
    pub fn validate_p256_signature(
        &self,
        webauthn_data: WebAuthnData,
        compressed_public_key: String,
    ) -> bool {
        let (verifying_key, signed_data, signature) = match (
            self.create_verifying_key(&compressed_public_key),
            self.prepare_signed_data(&webauthn_data),
            self.create_signature(&webauthn_data.signature),
        ) {
            (Ok(key), Ok(data), Ok(sig)) => (key, data, sig),
            (Err(e), _, _) => {
                log!("Failed to create verifying key: {}", e);
                return false;
            }
            (_, Err(e), _) => {
                log!("Failed to prepare signed data: {}", e);
                return false;
            }
            (_, _, Err(e)) => {
                log!("Failed to create signature: {}", e);
                return false;
            }
        };

        verifying_key.verify(&signed_data, &signature).is_ok()
    }

    #[inline(always)]
    fn create_verifying_key(&self, compressed_public_key: &str) -> Result<VerifyingKey, String> {
        let compressed_bytes = hex::decode(
            compressed_public_key
                .strip_prefix("0x")
                .unwrap_or(compressed_public_key),
        )
        .map_err(|_| "Invalid hex encoding in public key")?;

        let key = P256PublicKey::from_sec1_bytes(&compressed_bytes)
            .map_err(|_| String::from("Invalid SEC1 encoding in public key"))?;
        Ok(
            VerifyingKey::from_encoded_point(&key.to_encoded_point(false))
                .map_err(|_| String::from("Failed to create verifying key from point"))?,
        )
    }

    #[inline(always)]
    fn prepare_signed_data(&self, webauthn_data: &WebAuthnData) -> Result<Vec<u8>, String> {
        let auth_bytes = hex::decode(
            webauthn_data
                .authenticator_data
                .strip_prefix("0x")
                .unwrap_or(&webauthn_data.authenticator_data),
        )
        .map_err(|_| "Invalid hex encoding in authenticator data")?;

        let mut hasher = Sha256::new();
        hasher.update(webauthn_data.client_data.as_bytes());
        let client_data_hash = hasher.finalize();

        let mut result = Vec::with_capacity(auth_bytes.len() + 32);
        result.extend_from_slice(&auth_bytes);
        result.extend_from_slice(&client_data_hash);
        Ok(result)
    }

    #[inline(always)]
    fn create_signature(
        &self,
        signature: &String,
    ) -> Result<P256Signature, String> {
        let sig_bytes = hex::decode(signature.strip_prefix("0x").unwrap_or(signature))
            .map_err(|_| "Invalid hex encoding in signature")?;

        Ok(P256Signature::try_from(sig_bytes.as_slice())
            .map_err(|_| String::from("Invalid signature format"))?)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn get_compressed_public_key() -> String {
        "0x0220fb23e028391b72c517850b3cc83ba529ef4db766098a29bf3c8d06be957878".to_string()
    }

    #[test]
    fn validate_signature_should_succeed() {
        let contract = WebAuthnAuthContract::default();
        let compressed_public_key = get_compressed_public_key();
        let webauthn_data = WebAuthnData {
            signature:"0xf77969b7eaeaaed4b9a5cc5636b3755259d29d1406d8e852a8ce43dc74644da11453962702ea21a9efdd4a7077e39fcd754e3d01579493cf972f0151b6672f1f".to_string(),
            authenticator_data: "0x49960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d97631900000000".to_string(),
            client_data: r#"{"type":"webauthn.get","challenge":"tAuyPmQcczI8CFoTekJz5iITeP80zcJ60VTC4sYz5s8","origin":"http://localhost:3000","crossOrigin":false}"#.to_string(),
        };

        assert!(contract.validate_p256_signature(webauthn_data, compressed_public_key));
    }

    #[test]
    fn validate_signature_should_fail() {
        let contract = WebAuthnAuthContract::default();
        let compressed_public_key = get_compressed_public_key();
        let webauthn_data = WebAuthnData {
            signature: "0x563a2aba62db8a60c0877a87a2c6db9637bba0b7d8fd505628947e763371c01669ac141b8bc054d27a5cee9438ac7f6f11537523a6ab8affc0557b634f082cea".to_string(),
            authenticator_data: "49960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d97631d00000000".to_string(),
            client_data: r#"{"type":"webauthn.get","challenge":"cmFuZG9tLWNoYWxsZW5nZQ","origin":"http://localhost:3000","crossOrigin":false}"#.to_string(),
        };

        assert!(!contract.validate_p256_signature(webauthn_data, compressed_public_key));
    }
}
