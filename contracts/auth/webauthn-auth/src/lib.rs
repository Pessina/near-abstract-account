use interfaces::webauthn_auth::{PublicKey, Signature, WebAuthnData};
use near_sdk::near;
use p256::{
    ecdsa::{signature::Verifier, Signature as P256Signature, VerifyingKey},
    elliptic_curve::sec1::ToEncodedPoint,
    EncodedPoint, PublicKey as P256PublicKey,
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
    // Validates a WebAuthn passkey signature using the P-256 elliptic curve.
    pub fn validate_p256_signature(
        &self,
        webauthn_data: WebAuthnData,
        compressed_public_key: String,
    ) -> bool {
        let signed_data = self.prepare_signed_data(
            &webauthn_data.authenticator_data,
            &webauthn_data.client_data,
        );
        let public_key = self.decompress_public_key(&compressed_public_key);

        println!("public_key: {:?}", public_key);

        let verifying_key = self.import_public_key(public_key);
        let signature = self.prepare_signature_array(webauthn_data.signature);

        verifying_key.verify(&signed_data, &signature).is_ok()
    }

    fn prepare_signed_data(&self, authenticator_data: &str, client_data: &str) -> Vec<u8> {
        let authenticator_data = authenticator_data
            .strip_prefix("0x")
            .unwrap_or(authenticator_data);
        let authenticator_data =
            hex::decode(authenticator_data).expect("Invalid authenticator data");
        let client_data_hash = Sha256::digest(client_data.as_bytes());
        [authenticator_data, client_data_hash.to_vec()].concat()
    }

    fn decompress_public_key(&self, compressed_public_key: &str) -> PublicKey {
        let compressed_bytes =
            hex::decode(&compressed_public_key[2..]).expect("Invalid compressed public key");
        let decompressed_key = P256PublicKey::from_sec1_bytes(&compressed_bytes).unwrap();
        let decompressed = decompressed_key.to_encoded_point(false);

        PublicKey {
            x: hex::encode(decompressed.x().unwrap()),
            y: hex::encode(decompressed.y().unwrap()),
        }
    }

    fn import_public_key(&self, public_key: PublicKey) -> VerifyingKey {
        let x = public_key.x.strip_prefix("0x").unwrap_or(&public_key.x);
        let y = public_key.y.strip_prefix("0x").unwrap_or(&public_key.y);
        let x = hex::decode(x).expect("Invalid public key x coordinate");
        let y = hex::decode(y).expect("Invalid public key y coordinate");
        let point =
            EncodedPoint::from_affine_coordinates(x.as_slice().into(), y.as_slice().into(), false);
        VerifyingKey::from_encoded_point(&point).expect("Invalid public key")
    }

    fn prepare_signature_array(&self, signature: Signature) -> P256Signature {
        let r = signature.r.strip_prefix("0x").unwrap_or(&signature.r);
        let s = signature.s.strip_prefix("0x").unwrap_or(&signature.s);
        let r = hex::decode(r).expect("Invalid signature r value");
        let s = hex::decode(s).expect("Invalid signature s value");
        let combined = [r, s].concat();
        P256Signature::try_from(combined.as_slice()).expect("Invalid signature")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn get_compressed_public_key() -> String {
        "0x039f6ceec855f5ef57984863418d948070d1c384d0c02295c1a84c7cad427869f5".to_string()
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
