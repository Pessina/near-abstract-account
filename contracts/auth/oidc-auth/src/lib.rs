use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use jwt_simple::prelude::*;
use near_sdk::{log, near};
use near_sdk::{serde::{Deserialize, Serialize}, borsh::{BorshSerialize, BorshDeserialize, BorshSchema}};
use schemars::JsonSchema;

#[derive(Debug)]
pub enum OIDCError {
    InvalidTokenFormat,
    TokenExpired,
    InvalidSignature,
    UnsupportedIssuer,
    InvalidPublicKey,
    KeyIdNotFound,
}

#[derive(Serialize, Deserialize, Default, BorshSerialize, BorshDeserialize, JsonSchema, BorshSchema)]
#[serde(crate = "near_sdk::serde")]
struct Claims {
    exp: i64,
    iss: String,
    sub: String,
}

#[derive(Serialize, Deserialize, Default, BorshSerialize, BorshDeserialize, JsonSchema, BorshSchema)]
#[serde(crate = "near_sdk::serde")]
struct PublicKey {
    kid: String,
    n: String,
    e: String,
    use_: String,
    alg: String,
    kty: String,
}

#[derive(Serialize, Deserialize, Default, BorshSerialize, BorshDeserialize, JsonSchema, BorshSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct KeySet {
    keys: Vec<PublicKey>,
}

#[near(contract_state)]
#[derive(Default)]
pub struct OIDCAuthContract {
    google_keys: KeySet,
    facebook_keys: KeySet,
}

#[near]
impl OIDCAuthContract {
    pub fn validate_oidc_token(&self, token: String, issuer: String) -> bool {
        match self.validate_token_internal(&token, &issuer) {
            Ok(_) => true,
            Err(e) => {
                log!("Token validation failed: {:?}", e);
                false
            }
        }
    }

    fn validate_token_internal(&self, token: &str, issuer: &str) -> Result<(), OIDCError> {
        log!("Starting token validation for issuer: {}", issuer);
    
        let key_set = match issuer {
            "https://accounts.google.com" => &self.google_keys,
            "https://www.facebook.com" => &self.facebook_keys,
            _ => return Err(OIDCError::UnsupportedIssuer),
        };
    
        // Parse token header to get kid
        let parts: Vec<&str> = token.split('.').collect();
        if parts.len() != 3 {
            return Err(OIDCError::InvalidTokenFormat);
        }
    
        let header_json = URL_SAFE_NO_PAD.decode(parts[0])
            .map_err(|_| OIDCError::InvalidTokenFormat)?;
        
        let header: serde_json::Value = serde_json::from_slice(&header_json)
            .map_err(|_| OIDCError::InvalidTokenFormat)?;
        
        let kid = header["kid"].as_str()
            .ok_or(OIDCError::InvalidTokenFormat)?;
    
        let public_key = key_set.keys.iter()
            .find(|k| k.kid == kid)
            .ok_or(OIDCError::KeyIdNotFound)?;
    
        // Create RSA public key
        let n = URL_SAFE_NO_PAD.decode(&public_key.n)
            .map_err(|_| OIDCError::InvalidPublicKey)?;
        let e = URL_SAFE_NO_PAD.decode(&public_key.e)
            .map_err(|_| OIDCError::InvalidPublicKey)?;
    
        let rs_public_key = RS256PublicKey::from_components(&n, &e)
            .map_err(|_| OIDCError::InvalidPublicKey)?;
    
        // Set verification options - only verify signature
        let verification = VerificationOptions {
            time_tolerance: Some(Duration::from_days(1)),
            max_validity: Some(Duration::from_days(1)),
            allowed_issuers: Some(vec![issuer.to_string()].into_iter().collect()),
            allowed_audiences: None,
            ..Default::default()
        };
    
        match rs_public_key.verify_token::<NoCustomClaims>(token, Some(verification)) {
            Ok(_) => {
                log!("Token validation successful");
                Ok(())
            },
            Err(e) => {
                log!("Token validation failed: {:?}", e);
                Err(OIDCError::InvalidSignature)
            }
        }
    }
    
    pub fn update_google_keys(&mut self, keys: KeySet) {
        log!("Updating Google keys");
        self.google_keys = keys;
    }

    pub fn update_facebook_keys(&mut self, keys: KeySet) {
        log!("Updating Facebook keys");
        self.facebook_keys = keys;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn get_test_contract() -> OIDCAuthContract {
        let mut contract = OIDCAuthContract::default();
        // Test public keys from Google and Facebook JWKs
        contract.google_keys = KeySet {
            keys: vec![
                PublicKey {
                    e: "AQAB".to_string(),
                    kid: "89ce3598c473af1bda4bff95e6c8736450206fba".to_string(),
                    use_: "sig".to_string(),
                    kty: "RSA".to_string(),
                    n: "wvLUmyAlRhJkFgok97rojtg0xkqsQ6CPPoqRUSXDIYcjfVWMy1Z4hk_-90Y554KTuADfT_0FA46FWb-pr4Scm00gB3CnM8wGLZiaUeDUOu84_Zjh-YPVAua6hz6VFa7cpOUOQ5ZCxCkEQMjtrmei21a6ijy5LS1n9fdiUsjOuYWZSoIQCUj5ow5j2asqYYLRfp0OeymYf6vnttYwz3jS54Xe7tYHW2ZJ_DLCja6mz-9HzIcJH5Tmv5tQRhAUs3aoPKoCQ8ceDHMblDXNV2hBpkv9B6Pk5QVkoDTyEs7lbPagWQ1uz6bdkxM-DnjcMUJ2nh80R_DcbhyqkK4crNrM1w".to_string(),
                    alg: "RS256".to_string(),
                },
                PublicKey {
                    e: "AQAB".to_string(),
                    kid: "dd125d5f462fbc6014aedab81ddf3bcedab70847".to_string(),
                    use_: "sig".to_string(),
                    kty: "RSA".to_string(),
                    n: "jwstqI4w2drqbTTVRDriFqepwVVI1y05D5TZCmGvgMK5hyOsVW0tBRiY9Jk9HKDRue3vdXiMgarwqZEDOyOA0rpWh-M76eauFhRl9lTXd5gkX0opwh2-dU1j6UsdWmMa5OpVmPtqXl4orYr2_3iAxMOhHZ_vuTeD0KGeAgbeab7_4ijyLeJ-a8UmWPVkglnNb5JmG8To77tSXGcPpBcAFpdI_jftCWr65eL1vmAkPNJgUTgI4sGunzaybf98LSv_w4IEBc3-nY5GfL-mjPRqVCRLUtbhHO_5AYDpqGj6zkKreJ9-KsoQUP6RrAVxkNuOHV9g1G-CHihKsyAifxNN2Q".to_string(),
                    alg: "RS256".to_string(),
                }
            ]
        };
        contract.facebook_keys = KeySet {
            keys: vec![
                PublicKey {
                    e: "AQAB".to_string(),
                    kid: "aec39658e5442376611f0698a886df9606c03a7c".to_string(),
                    use_: "sig".to_string(),
                    kty: "RSA".to_string(),
                    n: "yJnCLmLeCs9hiijCmP2wTzNcV0N73wVbm0rmh2QZu6m5RoHCbeVPNDsqNsfYvPCZG0-l_AteOEDu1mBOs9q9wyZ5pAlO1voFuIh8UCpkbPxDZoWXdI9hTv1U70RdN9SrGf552GfvOBNSOAAlAiJdPsTrQ3yIlopDsYk87yD5CeHERKWz4oIF0F5bPe7uZfJxKQM97o2m-UeI56lueHT1s_me7UY7zLu5pwHX-s_ZPBb4JZUlMJdCnhzQS_m5oS6XAWX8EiFc-GPn-_V0fG3LSxW6cOq1kbRae2i78yT7qK0i80BpRQ3U4wwIcK5IfY4NZoACvtoLkf82KTw7tysQoQ".to_string(),
                    alg: "RS256".to_string(),
                },
                PublicKey {
                    e: "AQAB".to_string(),
                    kid: "1e43d9e5cde459139a9d5327dd89992685a0154a".to_string(),
                    use_: "sig".to_string(),
                    kty: "RSA".to_string(),
                    n: "oodq2r5oXMj8VWU2RTxKXqIqtRuPIz3pa6dDHF7TYkaTMhi23tP2AF8I4FcovgsrtWnz8v-Ax20apjZEaKPLHxFPTITPqjuZ-XVkTiBpY2y6xXTZ4N3TohbxY0C9TMcdpdK357hSwnmYPkOT6HlAxFadud60wTu_DyGkWvKhz3km-9tX93JfbHVsn5dbZ42atqFXqwXbWj9MvVYHgF7tK3NeVBg_DJSTS1owP5OpH6xJMI6q6ANldtqHQU7AhGQmwOo_LSrUwdjG9hejjckG8ju3XPjEa6gDVIKYQFcO1am9SXVN5HaXmX8H3n2BaNb2Rhl_zgNwXAMgJVEJ3e5_KQ".to_string(),
                    alg: "RS256".to_string(),
                }
            ]
        };
        contract
    }

    #[test]
    fn validate_google_token_should_succeed() {
        let contract = get_test_contract();
        let token = "eyJhbGciOiJSUzI1NiIsImtpZCI6Ijg5Y2UzNTk4YzQ3M2FmMWJkYTRiZmY5NWU2Yzg3MzY0NTAyMDZmYmEiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiI3Mzk5MTEwNjk3OTctaWRwMDYyODY2OTY0Z2JuZG82NjkzaDMydGdhNWN2bDEuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiI3Mzk5MTEwNjk3OTctaWRwMDYyODY2OTY0Z2JuZG82NjkzaDMydGdhNWN2bDEuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMTc5MDI4NTUzNzMxNTc0MTAzMzAiLCJlbWFpbCI6ImZzLnBlc3NpbmFAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5iZiI6MTczNjUxMTQ1OCwibmFtZSI6IkZlbGlwZSBQZXNzaW5hIiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0pLSmJVeUJWcUNCdjRxVkdPRFNuVlRnTEhQS04wdFZPTUlNWFZpdWtncmQtMHRmZWRVPXM5Ni1jIiwiZ2l2ZW5fbmFtZSI6IkZlbGlwZSIsImZhbWlseV9uYW1lIjoiUGVzc2luYSIsImlhdCI6MTczNjUxMTc1OCwiZXhwIjoxNzM2NTE1MzU4LCJqdGkiOiI4NTQ0YzMwZGQ2MjA3NzM3NDQ1ZjRlMWE1MGYxMjA0Nzk1YmVkMWJmIn0.YrQny7qVn6dWa_ojGPCHJshT_pofwjIFTmhqQA5nR_-T3p0Wi7RCSg4dJ138yTZAxmcwwEzjT3m9oOSKxlzPDRROOdXCOx0ljwgzsTKqq3JuzOB8bRdT3NmY4E9cr4NLzkR-99JQvYeOLV46q_uxytJ20deyE-4OP4qbKhyc_ZILVitJ8Vus5yB68eGLhZwO6Ew9k8FZGy11xJLUuGjhwZ6cg-peFjWaj3uk8H_nN-UyF_iPzhxVcsndyiB6O9h2JS9mEg-Xzj8wuEzRQ1SqTLQjMjMWmZ1KhY7KkQhb8vrGLzk8cuR_fnOKTwv0N7qHjrahLxejBNlmAkfgCQyFsg";
        
        assert!(contract.validate_oidc_token(
            token.to_string(),
            "https://accounts.google.com".to_string()
        ));
    }

    #[test]
    fn validate_facebook_token_should_succeed() {
        let contract = get_test_contract();
        let token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImFlYzM5NjU4ZTU0NDIzNzY2MTFmMDY5OGE4ODZkZjk2MDZjMDNhN2MifQ.eyJpc3MiOiJodHRwczpcL1wvd3d3LmZhY2Vib29rLmNvbSIsImF1ZCI6IjIxMDM0OTYyMjAwNDU4NDMiLCJzdWIiOiI5MDAxMTQ1NzQzMjcwMjgwIiwiaWF0IjoxNzM2NTE0MjU4LCJleHAiOjE3MzY1MTc4NTgsImp0aSI6IjJ5aWUuZmQzOTc0ZjIyMDU2Njk4YWQxMzMyY2IxY2JhOTVhMGJiYzdiZjM0ZDM5YTJjMzAwMmRmZDM1MDk5MTEwNzkzOCIsIm5vbmNlIjoiIiwiYXRfaGFzaCI6Im5LSTB5NTRtUTVSOHJLMXZSNUEtWEEiLCJlbWFpbCI6ImZzLnBlc3NpbmFcdTAwNDBnbWFpbC5jb20iLCJnaXZlbl9uYW1lIjoiRmVsaXBlIiwiZmFtaWx5X25hbWUiOiJQZXNzaW5hIiwibmFtZSI6IkZlbGlwZSBQZXNzaW5hIiwicGljdHVyZSI6Imh0dHBzOlwvXC9wbGF0Zm9ybS1sb29rYXNpZGUuZmJzYnguY29tXC9wbGF0Zm9ybVwvcHJvZmlsZXBpY1wvP2FzaWQ9OTAwMTE0NTc0MzI3MDI4MCZoZWlnaHQ9MTAwJndpZHRoPTEwMCZleHQ9MTczOTEwNjI1OCZoYXNoPUFiYnNqYzdham5ZWXFMYXJMWHdnLVlNTyJ9.VeZRS6yn6wBsAduWn7DabLE01WiGmEBeCTDYJsHbKCsisV6J1Eugym6GN10BYCUxY9yp4wePIpXa-fdbz31HX-HReC-xPLM2DIry4MIx8xgZeNTzoktuEd0v2EHqjChtZOWPKYHtv58HOTojMCUtekOZkVenbGxHh-kritvqkq-l1q8PxOPMrJnOL4c0Ie7-Rl2UJH-doTALCSLa4F6EI1HQgFB8zk8aEN5a_nPq0QJBFzHK8F-4yTy_WqaQ2sgi-rHoE9qaK6SCOTfHcYjPEbX2Y9YM48FV9eoWHaxmb_FF81zd7UEd8WsjOhJj_f9nNLqQKUZG3NgYfsLHgLTHyQ";
        
        assert!(contract.validate_oidc_token(
            token.to_string(), 
            "https://www.facebook.com".to_string()
        ));
    }

    #[test]
    fn validate_google_token_should_fail_signature_invalid() {
        let contract = get_test_contract();
        let token = "eyJhbGciOiJSUzI1NiIsImtpZCI6Ijg5Y2UzNTk4YzQ3M2FmMWJkYTRiZmY5NWU2Yzg3MzY0NTAyMDZmYmEiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiI3Mzk5MTEwNjk3OTctaWRwMDYyODY2OTY0Z2JuZG82NjkzaDMydGdhNWN2bDEuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiI3Mzk5MTEwNjk3OTctaWRwMDYyODY2OTY0Z2JuZG82NjkzaDMydGdhNWN2bDEuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMTc5MDI4NTUzNzMxNTc0MTAzMzAiLCJlbWFpbCI6ImZzLnBlc3NpbmFAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5iZiI6MTczNjUxMTQ1OCwibmFtZSI6IkZlbGlwZSBQZXNzaW5hIiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0pLSmJVeUJWcUNCdjRxVkdPRFNuVlRnTEhQS04wdFZPTUlNWFZpdWtncmQtMHRmZWRVPXM5Ni1jIiwiZ2l2ZW5fbmFtZSI6IkZlbGlwZSIsImZhbWlseV9uYW1lIjoiUGVzc2luYSIsImlhdCI6MTczNjUxMTc1OCwiZXhwIjoxNzM2NTE1MzU4LCJqdGkiOiI4NTQ0YzMwZGQ2MjA3NzM3NDQ1ZjRlMWE1MGYxMjA0Nzk1YmVkMWJmIn0.YrQny7qVn6dWa_ojGPCHJshT_pofwjIFTmhqQA5nR_-T3p0Wi7RCSg4dJ138yTZAxmcwwEzjT3m9oOSKxlzPDRROOdXCOx0ljwgzsTKqq3JuzOB8bRdT3NmY4E9cr4NLzkR-99JQvYeOLV46q_uxytJ20deyE-4OP4qbKhyc_ZILVitJ8Vus5yB68eGLhZwO6Ew9k8FZGy11xJLUuGjhwZ6cg-peFjWaj3uk8H_nN-UyF_iPzhzVcsndyiB6O9h2JS9mEg-Xzj8wuEzRQ1SqTLQjMjMWmZ1KhY7KkQhb8vrGLzk8cuR_fnOKTwv0N7qHjrahLxejBNlmAkfgCQyFsg";
        
        assert!(!contract.validate_oidc_token(
            token.to_string(),
            "https://accounts.google.com".to_string()
        ));
    }

    #[test]
    fn validate_facebook_token_should_fail_signature_invalid() {
        let contract = get_test_contract();
        let token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImFlYzM5NjU4ZTU0NDIzNzY2MTFmMDY5OGE4ODZkZjk2MDZjMDNhN2MifQ.eyJpc3MiOiJodHRwczpcL1wvd3d3LmZhY2Vib29rLmNvbSIsImF1ZCI6IjIxMDM0OTYyMjAwNDU4NDMiLCJzdWIiOiI5MDAxMTQ1NzQzMjcwMjgwIiwiaWF0IjoxNzM2NTE0MjU4LCJleHAiOjE3MzY1MTc4NTgsImp0aSI6IjJ5aWUuZmQzOTc0ZjIyMDU2Njk4YWQxMzMyY2IxY2JhOTVhMGJiYzdiZjM0ZDM5YTJjMzAwMmRmZDM1MDk5MTEwNzkzOCIsIm5vbmNlIjoiIiwiYXRfaGFzaCI6Im5LSTB5NTRtUTVSOHJLMXZSNUEtWEEiLCJlbWFpbCI6ImZzLnBlc3NpbmFcdTAwNDBnbWFpbC5jb20iLCJnaXZlbl9uYW1lIjoiRmVsaXBlIiwiZmFtaWx5X25hbWUiOiJQZXNzaW5hIiwibmFtZSI6IkZlbGlwZSBQZXNzaW5hIiwicGljdHVyZSI6Imh0dHBzOlwvXC9wbGF0Zm9ybS1sb29rYXNpZGUuZmJzYnguY29tXC9wbGF0Zm9ybVwvcHJvZmlsZXBpY1wvP2FzaWQ9OTAwMTE0NTc0MzI3MDI4MCZoZWlnaHQ9MTAwJndpZHRoPTEwMCZleHQ9MTczOTEwNjI1OCZoYXNoPUFiYnNqYzdham5ZWXFMYXJMWHdnLVlNTyJ9.VeZRS6yn6wBsAduWn7DabLE01WiGmEBeCTDYJsHbKCsisV6J1Eugym6GN10BYCUxY9yp4wePIpXa-fdbz31HX-HReC-xPLM2DIry4MIx8xgZeNTzoktuEd0v2EHqjChtZOWPKYHtv58HOTojMCUtekOZkVenbGxHh-kritvqkq-l1q8PxOPMrJnOL4c0Ie7-Rl2UJH-doTALCSLa4F6EI1HQgFB8zk8aEN5a_nPq0QJBFzHK8F-4yTy_WqaQ2sgi-rHoE9qaK6SCOTfHcYjPEbX2Y9YM48FV9eoWHaxmb_FF81zd7UEd8ssjOhJj_f9nNLqQKUZG3NgYfsLHgLTHyQ";
        
        assert!(!contract.validate_oidc_token(
            token.to_string(), 
            "https://www.facebook.com".to_string()
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
