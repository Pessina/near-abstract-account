mod types;

use crate::types::{PublicKey, Signature, WebAuthnData};
use near_sdk::near;
use p256::{
    ecdsa::{signature::Verifier, Signature as P256Signature, VerifyingKey},
    EncodedPoint,
};
use sha2::{Digest, Sha256};

#[near(contract_state)]
pub struct Contract {}

impl Default for Contract {
    fn default() -> Self {
        Self {}
    }
}

#[near]
impl Contract {
    /// Validates a WebAuthn passkey signature using the P-256 elliptic curve.
    pub fn validate_p256_signature(&self, webauthn_data: WebAuthnData) -> bool {
        let signed_data = self.prepare_signed_data(
            &webauthn_data.authenticator_data,
            &webauthn_data.client_data,
        );
        let public_key = self.import_public_key(webauthn_data.public_key);
        let signature = self.prepare_signature_array(webauthn_data.signature);

        public_key.verify(&signed_data, &signature).is_ok()
    }

    fn prepare_signed_data(&self, authenticator_data: &str, client_data: &str) -> Vec<u8> {
        let authenticator_data =
            hex::decode(authenticator_data).expect("Invalid authenticator data");
        let client_data_hash = Sha256::digest(client_data.as_bytes());
        [authenticator_data, client_data_hash.to_vec()].concat()
    }

    fn import_public_key(&self, public_key: PublicKey) -> VerifyingKey {
        let x = hex::decode(public_key.x).expect("Invalid public key x coordinate");
        let y = hex::decode(public_key.y).expect("Invalid public key y coordinate");
        let point =
            EncodedPoint::from_affine_coordinates(x.as_slice().into(), y.as_slice().into(), false);
        VerifyingKey::from_encoded_point(&point).expect("Invalid public key")
    }

    fn prepare_signature_array(&self, signature: Signature) -> P256Signature {
        let r = hex::decode(signature.r).expect("Invalid signature r value");
        let s = hex::decode(signature.s).expect("Invalid signature s value");
        let combined = [r, s].concat();
        P256Signature::try_from(combined.as_slice()).expect("Invalid signature")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_signature_should_succeed() {
        let contract = Contract::default();
        let webauthn_data = WebAuthnData {
            public_key: PublicKey {
                x: "13aabc191d749b6fe278745db9b17741ad2732a67073a25b7a25230fc10dad63".to_string(),
                y: "1eb43bbb8add0bfa8c99d65a37c1e0009ba908e6cd61b69705b4619fa2a0bb5e".to_string(),
            },
            signature: Signature {
                r: "6bc8437ba86b6ebded1d4943828bf9e12c639eb21b7d96158741a3a82f9bbc65".to_string(),
                s: "7b6202afb2b5543ca897a9f2036918afe874dac23e5f2ee527e63f01abbd53cb".to_string(),
            },
            authenticator_data: "49960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d97631d00000000".to_string(),
            client_data: r#"{"type":"webauthn.get","challenge":"QXV0aGVudGljYXRlOjEyODAwNQ","origin":"http://localhost:3000","crossOrigin":false}"#.to_string(),
        };

        assert!(contract.validate_p256_signature(webauthn_data));
    }

    #[test]
    fn validate_signature_should_fail() {
        let contract = Contract::default();
        let webauthn_data = WebAuthnData {
            public_key: PublicKey {
                x: "13aabc191d749b6fe278745db9b17741ad2732a67073a25b7a25230fc10dad63".to_string(),
                y: "1eb43bbb8add0bfa8c99d65a37c1e0009ba908e6cd61b69705b4619fa2a0bb5e".to_string(),
            },
            signature: Signature {
                r: "fd3c8efd79cf8ee65f47f64b0109699c0b06819319a4007cb4ceb5cbb113852d".to_string(),
                s: "69fc59fde3f234412c8d01ae1f11976a562efc74c81ff028ec85334b5d531af3".to_string(),
            },
            authenticator_data: "49960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d97631d00000000".to_string(),
            client_data: r#"{"type":"webauthn.get","challenge":"QXV0aGVudGljYXRlOjE0Mjk5OQ","origin":"http://localhost:3000","crossOrigin":false}"#.to_string(),
        };

        assert!(!contract.validate_p256_signature(webauthn_data));
    }
}
