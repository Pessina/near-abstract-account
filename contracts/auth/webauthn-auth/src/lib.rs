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
        "0x035e92b7d1a8418e25c61c13ed58d9145062c93480c4c3d608ffdc37c637aeecec".to_string()
    }

    #[test]
    fn validate_signature_should_succeed() {
        let contract = WebAuthnAuthContract::default();
        let compressed_public_key = get_compressed_public_key();
        let webauthn_data = WebAuthnData {
            signature: Signature {
                r: "0xc44e18af5ead33812727a4e29883ff5f46697c6f707d37d861fa3dae53def7f6".to_string(),
                s: "0x2fec3cc3274e71834a3a543c48fa7aa9e3a7ed70c6a42df7e61a1a31f9a5267f".to_string(),
            },
            authenticator_data: "0x49960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d97631d00000000".to_string(),
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
                r: "0xfd3c8efd79cf8ee65f47f64b0109699c0b06819319a4007cb4ceb5cbb113852d".to_string(),
                s: "0x69fc59fde3f234412c8d01ae1f11976a562efc74c81ff028ec85334b5d531af3".to_string(),
            },
            authenticator_data: "0x49960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d97631d00000000".to_string(),
            client_data: r#"{"type":"webauthn.get","challenge":"QXV0aGVudGljYXRlOjE0Mjk5OQ","origin":"http://localhost:3000","crossOrigin":false}"#.to_string(),
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
    //             "83edaf514e87c7914500d59baa373a04e206c04d30e5e6a1c901ed78bd1c7514",
    //         )
    //         .unwrap(),
    //         y: <[u8; 32]>::from_hex(
    //             "8559eacbc111bfdfc20623274e41d93ad8b5b0e28b49bf066164b7ffed7fcbb2",
    //         )
    //         .unwrap(),
    //         compressed: "0x0283edaf514e87c7914500d59baa373a04e206c04d30e5e6a1c901ed78bd1c7514"
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
