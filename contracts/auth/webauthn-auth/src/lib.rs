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
pub struct WebAuthnAuthContract {}

impl Default for WebAuthnAuthContract {
    fn default() -> Self {
        Self {}
    }
}

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
        signature: &interfaces::webauthn_auth::Signature,
    ) -> Result<P256Signature, String> {
        let mut combined = Vec::with_capacity(64);
        combined.extend_from_slice(
            &hex::decode(signature.r.strip_prefix("0x").unwrap_or(&signature.r))
                .map_err(|_| "Invalid hex encoding in signature r component")?,
        );
        combined.extend_from_slice(
            &hex::decode(signature.s.strip_prefix("0x").unwrap_or(&signature.s))
                .map_err(|_| "Invalid hex encoding in signature s component")?,
        );

        Ok(P256Signature::try_from(combined.as_slice())
            .map_err(|_| String::from("Invalid signature format"))?)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use interfaces::webauthn_auth::Signature;

    fn get_compressed_public_key() -> String {
        "039f6ceec855f5ef57984863418d948070d1c384d0c02295c1a84c7cad427869f5".to_string()
    }

    #[test]
    fn validate_signature_should_succeed() {
        let contract = WebAuthnAuthContract::default();
        let compressed_public_key = get_compressed_public_key();
        let webauthn_data = WebAuthnData {
            signature: Signature {
                r: "573a2aba62db8a60c0877a87a2c6db9637bba0b7d8fd505628947e763371c016".to_string(),
                s: "69ac141b8bc054d27a5cee9438ac7f6f11537523a6ab8affc0557b634f082cea".to_string(),
            },
            authenticator_data: "49960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d97631d00000000".to_string(),
            client_data: r#"{"type":"webauthn.get","challenge":"cmFuZG9tLWNoYWxsZW5nZQ","origin":"http://localhost:3000","crossOrigin":false}"#.to_string(),
        };

        assert!(contract.validate_p256_signature(webauthn_data, compressed_public_key));
    }

    #[test]
    fn validate_signature_should_fail() {
        let contract = WebAuthnAuthContract::default();
        let compressed_public_key = get_compressed_public_key();
        let webauthn_data = WebAuthnData {
            signature: Signature {
                r: "563a2aba62db8a60c0877a87a2c6db9637bba0b7d8fd505628947e763371c016".to_string(),
                s: "69ac141b8bc054d27a5cee9438ac7f6f11537523a6ab8affc0557b634f082cea".to_string(),
            },
            authenticator_data: "49960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d97631d00000000".to_string(),
            client_data: r#"{"type":"webauthn.get","challenge":"cmFuZG9tLWNoYWxsZW5nZQ","origin":"http://localhost:3000","crossOrigin":false}"#.to_string(),
        };

        assert!(!contract.validate_p256_signature(webauthn_data, compressed_public_key));
    }

    // struct TestPublicKey {
    //     x: [u8; 32],
    //     y: [u8; 32],
    //     compressed: String,
    // }

    // fn get_test_public_key() -> TestPublicKey {
    //     use hex::FromHex;

    //     TestPublicKey {
    //         x: <[u8; 32]>::from_hex(
    //             "13aabc191d749b6fe278745db9b17741ad2732a67073a25b7a25230fc10dad63",
    //         )
    //         .unwrap(),
    //         y: <[u8; 32]>::from_hex(
    //             "1eb43bbb8add0bfa8c99d65a37c1e0009ba908e6cd61b69705b4619fa2a0bb5e",
    //         )
    //         .unwrap(),
    //         compressed: "0x0213aabc191d749b6fe278745db9b17741ad2732a67073a25b7a25230fc10dad63"
    //             .to_string(),
    //     }
    // }

    // #[test]
    // fn test_public_key_compression() {
    //     let test_key = get_test_public_key();

    //     // Create uncompressed public key bytes (0x04 || x || y)
    //     let mut uncompressed = Vec::with_capacity(65);
    //     uncompressed.push(0x04);
    //     uncompressed.extend_from_slice(&test_key.x);
    //     uncompressed.extend_from_slice(&test_key.y);

    //     // Parse the public key
    //     let pubkey = P256PublicKey::from_sec1_bytes(&uncompressed).unwrap();

    //     // Get compressed encoding
    //     let compressed = pubkey.to_encoded_point(true);
    //     let compressed_hex = format!("0x{}", hex::encode(compressed.as_bytes()));

    //     println!("compressed_hex: {:?}", compressed_hex);

    //     assert_eq!(compressed_hex, test_key.compressed);
    // }

    // #[test]
    // fn test_public_key_decompression() {
    //     let test_key = get_test_public_key();

    //     // Start from compressed key
    //     let compressed_bytes = hex::decode(&test_key.compressed[2..]).unwrap();
    //     let decompressed_key = P256PublicKey::from_sec1_bytes(&compressed_bytes).unwrap();

    //     // Get uncompressed encoding to verify x and y coordinates
    //     let decompressed = decompressed_key.to_encoded_point(false);
    //     let decompressed_x = decompressed.x().unwrap();
    //     let decompressed_y = decompressed.y().unwrap();

    //     assert_eq!(decompressed_x.as_slice(), &test_key.x);
    //     assert_eq!(decompressed_y.as_slice(), &test_key.y);
    // }
}
