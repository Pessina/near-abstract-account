use base64::{engine::general_purpose::URL_SAFE, Engine};
use jsonwebtoken::{decode, decode_header, Algorithm, DecodingKey, Validation};
use near_sdk::{env, log, near};
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum OIDCError {
    #[error("Invalid token format")]
    InvalidTokenFormat,
    #[error("Token expired")]
    TokenExpired,
    #[error("Invalid signature")]
    InvalidSignature,
    #[error("Unsupported issuer")]
    UnsupportedIssuer,
    #[error("Invalid public key")]
    InvalidPublicKey,
}

#[derive(Serialize, Deserialize)]
struct Claims {
    exp: i64,
    iss: String,
    sub: String,
    // Add other required claims
}

#[near(contract_state)]
#[derive(Default)]
pub struct OIDCAuthContract {
    // Hardcoded public keys for now - will fetch from oracle later
    google_pk: String,
    facebook_pk: String,
}

#[near]
impl OIDCAuthContract {
    /// Validates an OIDC JWT token signature
    pub fn validate_oidc_token(&self, token: String, issuer: String) -> bool {
        match self.validate_token_internal(&token, &issuer) {
            Ok(_) => true,
            Err(e) => {
                log!("Token validation failed: {}", e);
                false
            }
        }
    }

    fn validate_token_internal(&self, token: &str, issuer: &str) -> Result<(), OIDCError> {
        // Get public key based on issuer
        let public_key = match issuer {
            "https://accounts.google.com" => &self.google_pk,
            "https://graph.facebook.com" => &self.facebook_pk,
            _ => return Err(OIDCError::UnsupportedIssuer),
        };

        // Decode header to verify algorithm
        let header = decode_header(token).map_err(|_| OIDCError::InvalidTokenFormat)?;
        if header.alg != Algorithm::ES256 {
            return Err(OIDCError::InvalidTokenFormat);
        }

        // Decode key from base64
        let key_bytes = URL_SAFE
            .decode(public_key)
            .map_err(|_| OIDCError::InvalidPublicKey)?;

        // Setup validation
        let mut validation = Validation::new(Algorithm::ES256);
        validation.set_issuer(&[issuer]);
        validation.validate_exp = true;
        validation.leeway = 0; // No leeway for expiration

        // Verify token
        let decoding_key = DecodingKey::from_ec_der(&key_bytes);
        let token_data = decode::<Claims>(token, &decoding_key, &validation)
            .map_err(|_| OIDCError::InvalidSignature)?;

        // Additional timestamp validation
        let now = env::block_timestamp() as i64;
        if now > token_data.claims.exp {
            return Err(OIDCError::TokenExpired);
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn get_test_contract() -> OIDCAuthContract {
        let mut contract = OIDCAuthContract::default();
        // Test public keys (base64 encoded)
        contract.google_pk = "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEEVs/o5+uQbTjL3chynL4wXgUg2R9q9UU8I5mEovUf86QZ7kOBIjJwqnzD1omageEHWwHdBO6B+dFabmdT9POxg==".to_string();
        contract.facebook_pk = "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE9gxbFB8/q1zrB6w8l7DxwlD5UYHDqTZXij3HDyqHwZ8vV5nV6dQegZU4GhwHyoKXLbGIxhQj8Zr6PIVNkJGkBw==".to_string();
        contract
    }

    #[test]
    fn validate_google_token_should_succeed() {
        let contract = get_test_contract();
        let token = "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiZXhwIjoyNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
        
        assert!(contract.validate_oidc_token(
            token.to_string(),
            "https://accounts.google.com".to_string()
        ));
    }

    #[test]
    fn validate_facebook_token_should_succeed() {
        let contract = get_test_contract();
        let token = "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiZXhwIjoyNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
        
        assert!(contract.validate_oidc_token(
            token.to_string(), 
            "https://graph.facebook.com".to_string()
        ));
    }

    #[test]
    fn validate_expired_token_should_fail() {
        let contract = get_test_contract();
        let expired_token = "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiZXhwIjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
        
        assert!(!contract.validate_oidc_token(
            expired_token.to_string(),
            "https://accounts.google.com".to_string()
        ));
    }

    #[test]
    fn validate_invalid_issuer_should_fail() {
        let contract = get_test_contract();
        let token = "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiZXhwIjoyNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
        
        assert!(!contract.validate_oidc_token(
            token.to_string(),
            "https://invalid-issuer.com".to_string()
        ));
    }
}
