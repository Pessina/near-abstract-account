// Find all our documentation at https://docs.near.org
use near_sdk::near;
use p256::{
    ecdsa::{signature::Verifier, Signature, VerifyingKey},
    EncodedPoint,
};
use sha2::{Digest, Sha256};

// Define the contract structure
#[near(contract_state)]
pub struct Contract {}

// Define the default, which automatically initializes the contract
impl Default for Contract {
    fn default() -> Self {
        Self {}
    }
}

// Implement the contract structure
#[near]
impl Contract {
    pub fn validate_signature(
        &self,
        public_key: (String, String),
        signature: (String, String),
        authenticator_data: String,
        client_data: String,
    ) -> bool {
        // Prepare data for verification
        let signed_data = self.prepare_signed_data(&authenticator_data, &client_data);
        let public_key = self.import_public_key(public_key);
        let signature = self.prepare_signature_array(signature);

        // Verify the signature
        public_key.verify(&signed_data, &signature).is_ok()
    }

    fn prepare_signed_data(&self, authenticator_data: &str, client_data: &str) -> Vec<u8> {
        let authenticator_data =
            hex::decode(authenticator_data).expect("Invalid authenticator data");
        let client_data_hash = Sha256::digest(client_data.as_bytes());
        [authenticator_data, client_data_hash.to_vec()].concat()
    }

    fn import_public_key(&self, public_key: (String, String)) -> VerifyingKey {
        let x = hex::decode(public_key.0).expect("Invalid public key x coordinate");
        let y = hex::decode(public_key.1).expect("Invalid public key y coordinate");
        let point =
            EncodedPoint::from_affine_coordinates(x.as_slice().into(), y.as_slice().into(), false);
        VerifyingKey::from_encoded_point(&point).expect("Invalid public key")
    }

    fn prepare_signature_array(&self, signature: (String, String)) -> Signature {
        let r = hex::decode(signature.0).expect("Invalid signature r value");
        let s = hex::decode(signature.1).expect("Invalid signature s value");
        let combined = [r, s].concat();
        Signature::try_from(combined.as_slice()).expect("Invalid signature")
    }
}

/*
 * The rest of this file holds the inline tests for the code above
 * Learn more about Rust tests: https://doc.rust-lang.org/book/ch11-01-writing-tests.html
 */
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_signature_should_succeed() {
        let contract = Contract::default();
        // These are example values and should be replaced with actual test data
        let public_key = (
            "13aabc191d749b6fe278745db9b17741ad2732a67073a25b7a25230fc10dad63".to_string(),
            "1eb43bbb8add0bfa8c99d65a37c1e0009ba908e6cd61b69705b4619fa2a0bb5e".to_string(),
        );
        let signature = (
            "6bc8437ba86b6ebded1d4943828bf9e12c639eb21b7d96158741a3a82f9bbc65".to_string(),
            "7b6202afb2b5543ca897a9f2036918afe874dac23e5f2ee527e63f01abbd53cb".to_string(),
        );
        let authenticator_data =
            "49960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d97631d00000000"
                .to_string();
        let client_data = r#"{"type":"webauthn.get","challenge":"QXV0aGVudGljYXRlOjEyODAwNQ","origin":"http://localhost:3000","crossOrigin":false}"#.to_string();

        assert!(contract.validate_signature(
            public_key,
            signature,
            authenticator_data,
            client_data
        ));
    }

    #[test]
    fn validate_signature_should_fail() {
        let contract = Contract::default();
        // Using the same public key as before
        let public_key = (
            "13aabc191d749b6fe278745db9b17741ad2732a67073a25b7a25230fc10dad63".to_string(),
            "1eb43bbb8add0bfa8c99d65a37c1e0009ba908e6cd61b69705b4619fa2a0bb5e".to_string(),
        );
        // New signature from the provided assertion
        let signature = (
            "fd3c8efd79cf8ee65f47f64b0109699c0b06819319a4007cb4ceb5cbb113852d".to_string(),
            "69fc59fde3f234412c8d01ae1f11976a562efc74c81ff028ec85334b5d531af3".to_string(),
        );
        // New authenticator_data from the provided assertion
        let authenticator_data =
            "49960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d97631d00000000"
                .to_string();
        // New client_data from the provided assertion
        let client_data = r#"{"type":"webauthn.get","challenge":"QXV0aGVudGljYXRlOjE0Mjk5OQ","origin":"http://localhost:3000","crossOrigin":false}"#.to_string();

        // This assertion should fail
        assert!(!contract.validate_signature(
            public_key,
            signature,
            authenticator_data,
            client_data
        ));
    }
}
