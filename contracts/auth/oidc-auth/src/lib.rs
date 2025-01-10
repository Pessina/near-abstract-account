use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use interfaces::oidc_auth::{OIDCAuthIdentity, OIDCData};
use jwt_simple::prelude::{NoCustomClaims, RS256PublicKey, RSAPublicKeyLike};
use near_sdk::{
    borsh::{self, BorshDeserialize, BorshSerialize},
    log, near,
    serde::{Deserialize, Serialize},
    store::LookupMap,
};
use schemars::JsonSchema;

#[derive(Debug, BorshDeserialize, BorshSerialize, Deserialize, Serialize, JsonSchema, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct PublicKey {
    pub kid: String,
    pub n: String,
    pub e: String,
    pub alg: String,
    pub kty: String,
    pub use_: String,
}

#[near(contract_state)]
pub struct OIDCAuthContract {
    pub google_keys: LookupMap<String, PublicKey>,
    pub facebook_keys: LookupMap<String, PublicKey>,
}

impl Default for OIDCAuthContract {
    fn default() -> Self {
        Self {
            google_keys: LookupMap::new(b"g"),
            facebook_keys: LookupMap::new(b"f"),
        }
    }
}

#[near]
impl OIDCAuthContract {
    #[init(ignore_state)]
    pub fn new() -> Self {
        Self::default()
    }

    pub fn validate_oidc_token(
        &self,
        oidc_data: OIDCData,
        oidc_auth_identity: OIDCAuthIdentity,
    ) -> bool {
        let parts: Vec<&str> = oidc_data.token.split('.').collect();
        if parts.len() != 3 {
            return false;
        }

        let payload_json = match URL_SAFE_NO_PAD.decode(parts[1]) {
            Ok(json) => json,
            Err(_) => return false,
        };

        let payload: serde_json::Value = match serde_json::from_slice(&payload_json) {
            Ok(p) => p,
            Err(_) => return false,
        };

        let token_issuer = match payload["iss"].as_str() {
            Some(issuer) => issuer,
            None => return false,
        };

        if token_issuer != oidc_auth_identity.issuer {
            return false;
        }

        let token_client_id = match payload["aud"].as_str() {
            Some(client_id) => client_id,
            None => return false,
        };
        if token_client_id != oidc_auth_identity.client_id {
            return false;
        }

        let token_email = match payload["email"].as_str() {
            Some(email) => email,
            None => return false,
        };
        if token_email != oidc_auth_identity.email {
            return false;
        }

        let token_nonce = match payload["nonce"].as_str() {
            Some(nonce) => nonce,
            None => return false,
        };
        if token_nonce != oidc_data.message {
            return false;
        }

        let key_set = match token_issuer {
            "https://accounts.google.com" => &self.google_keys,
            "https://www.facebook.com" => &self.facebook_keys,
            _ => return false,
        };

        let header_json = match URL_SAFE_NO_PAD.decode(parts[0]) {
            Ok(json) => json,
            Err(_) => return false,
        };

        let header: serde_json::Value = match serde_json::from_slice(&header_json) {
            Ok(h) => h,
            Err(_) => return false,
        };

        let kid = match header["kid"].as_str() {
            Some(k) => k,
            None => return false,
        };

        let public_key = match key_set.get(kid) {
            Some(key) => key,
            None => return false,
        };

        let n = match URL_SAFE_NO_PAD.decode(&public_key.n) {
            Ok(decoded) => decoded,
            Err(_) => return false,
        };

        let e = match URL_SAFE_NO_PAD.decode(&public_key.e) {
            Ok(decoded) => decoded,
            Err(_) => return false,
        };

        // The lines bellow cause InstantiateError when calling methods on the contract
        let rs_public_key = match RS256PublicKey::from_components(&n, &e) {
            Ok(key) => key,
            Err(_) => return false,
        };

        match rs_public_key.verify_token::<NoCustomClaims>(&oidc_data.token, None) {
            Ok(_) => true,
            Err(_) => false,
        }
    }

    // pub fn update_google_keys(&mut self, keys: KeySet) {
    //     log!("Updating Google keys");
    //     self.google_keys = keys;
    // }

    // pub fn update_facebook_keys(&mut self, keys: KeySet) {
    //     log!("Updating Facebook keys");
    //     self.facebook_keys = keys;
    // }

    pub fn logany(&self, any: String) {
        log!("{}", any);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn get_test_contract() -> OIDCAuthContract {
        let mut contract = OIDCAuthContract::default();

        contract.google_keys.insert("89ce3598c473af1bda4bff95e6c8736450206fba".to_string(), 
                PublicKey {
                    e: "AQAB".to_string(),
                    kid: "89ce3598c473af1bda4bff95e6c8736450206fba".to_string(),
                    use_: "sig".to_string(),
                    kty: "RSA".to_string(),
                    n: "wvLUmyAlRhJkFgok97rojtg0xkqsQ6CPPoqRUSXDIYcjfVWMy1Z4hk_-90Y554KTuADfT_0FA46FWb-pr4Scm00gB3CnM8wGLZiaUeDUOu84_Zjh-YPVAua6hz6VFa7cpOUOQ5ZCxCkEQMjtrmei21a6ijy5LS1n9fdiUsjOuYWZSoIQCUj5ow5j2asqYYLRfp0OeymYf6vnttYwz3jS54Xe7tYHW2ZJ_DLCja6mz-9HzIcJH5Tmv5tQRhAUs3aoPKoCQ8ceDHMblDXNV2hBpkv9B6Pk5QVkoDTyEs7lbPagWQ1uz6bdkxM-DnjcMUJ2nh80R_DcbhyqkK4crNrM1w".to_string(),
                    alg: "RS256".to_string(),
                });
        contract.google_keys.insert("dd125d5f462fbc6014aedab81ddf3bcedab70847".to_string(), 
                PublicKey {
                    e: "AQAB".to_string(),
                    kid: "dd125d5f462fbc6014aedab81ddf3bcedab70847".to_string(),
                    use_: "sig".to_string(),
                    kty: "RSA".to_string(),
                    n: "jwstqI4w2drqbTTVRDriFqepwVVI1y05D5TZCmGvgMK5hyOsVW0tBRiY9Jk9HKDRue3vdXiMgarwqZEDOyOA0rpWh-M76eauFhRl9lTXd5gkX0opwh2-dU1j6UsdWmMa5OpVmPtqXl4orYr2_3iAxMOhHZ_vuTeD0KGeAgbeab7_4ijyLeJ-a8UmWPVkglnNb5JmG8To77tSXGcPpBcAFpdI_jftCWr65eL1vmAkPNJgUTgI4sGunzaybf98LSv_w4IEBc3-nY5GfL-mjPRqVCRLUtbhHO_5AYDpqGj6zkKreJ9-KsoQUP6RrAVxkNuOHV9g1G-CHihKsyAifxNN2Q".to_string(),
                    alg: "RS256".to_string(),
                });
        contract.facebook_keys.insert("aec39658e5442376611f0698a886df9606c03a7c".to_string(), 
                PublicKey {
                    e: "AQAB".to_string(),
                    kid: "aec39658e5442376611f0698a886df9606c03a7c".to_string(),
                    use_: "sig".to_string(),
                    kty: "RSA".to_string(),
                    n: "yJnCLmLeCs9hiijCmP2wTzNcV0N73wVbm0rmh2QZu6m5RoHCbeVPNDsqNsfYvPCZG0-l_AteOEDu1mBOs9q9wyZ5pAlO1voFuIh8UCpkbPxDZoWXdI9hTv1U70RdN9SrGf552GfvOBNSOAAlAiJdPsTrQ3yIlopDsYk87yD5CeHERKWz4oIF0F5bPe7uZfJxKQM97o2m-UeI56lueHT1s_me7UY7zLu5pwHX-s_ZPBb4JZUlMJdCnhzQS_m5oS6XAWX8EiFc-GPn-_V0fG3LSxW6cOq1kbRae2i78yT7qK0i80BpRQ3U4wwIcK5IfY4NZoACvtoLkf82KTw7tysQoQ".to_string(),
                    alg: "RS256".to_string(),
                });
        contract.facebook_keys.insert("1e43d9e5cde459139a9d5327dd89992685a0154a".to_string(), 
                PublicKey {
                    e: "AQAB".to_string(),
                    kid: "1e43d9e5cde459139a9d5327dd89992685a0154a".to_string(),
                    use_: "sig".to_string(),
                    kty: "RSA".to_string(),
                    n: "oodq2r5oXMj8VWU2RTxKXqIqtRuPIz3pa6dDHF7TYkaTMhi23tP2AF8I4FcovgsrtWnz8v-Ax20apjZEaKPLHxFPTITPqjuZ-XVkTiBpY2y6xXTZ4N3TohbxY0C9TMcdpdK357hSwnmYPkOT6HlAxFadud60wTu_DyGkWvKhz3km-9tX93JfbHVsn5dbZ42atqFXqwXbWj9MvVYHgF7tK3NeVBg_DJSTS1owP5OpH6xJMI6q6ANldtqHQU7AhGQmwOo_LSrUwdjG9hejjckG8ju3XPjEa6gDVIKYQFcO1am9SXVN5HaXmX8H3n2BaNb2Rhl_zgNwXAMgJVEJ3e5_KQ".to_string(),
                    alg: "RS256".to_string(),
                });
        contract
    }

    #[test]
    fn validate_google_token_should_succeed() {
        let contract: OIDCAuthContract = get_test_contract();
        let oidc_data =  OIDCData{
            token: "eyJhbGciOiJSUzI1NiIsImtpZCI6Ijg5Y2UzNTk4YzQ3M2FmMWJkYTRiZmY5NWU2Yzg3MzY0NTAyMDZmYmEiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiI3Mzk5MTEwNjk3OTctaWRwMDYyODY2OTY0Z2JuZG82NjkzaDMydGdhNWN2bDEuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiI3Mzk5MTEwNjk3OTctaWRwMDYyODY2OTY0Z2JuZG82NjkzaDMydGdhNWN2bDEuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMTc5MDI4NTUzNzMxNTc0MTAzMzAiLCJlbWFpbCI6ImZzLnBlc3NpbmFAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5vbmNlIjoidGVzdF8xMjNfZmVsaXBlIiwibmJmIjoxNzM2NTIzMjM2LCJuYW1lIjoiRmVsaXBlIFBlc3NpbmEiLCJwaWN0dXJlIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2EvQUNnOG9jSktKYlV5QlZxQ0J2NHFWR09EU25WVGdMSFBLTjB0Vk9NSU1YVml1a2dyZC0wdGZlZFU9czk2LWMiLCJnaXZlbl9uYW1lIjoiRmVsaXBlIiwiZmFtaWx5X25hbWUiOiJQZXNzaW5hIiwiaWF0IjoxNzM2NTIzNTM2LCJleHAiOjE3MzY1MjcxMzYsImp0aSI6ImY3MjdlZjg1MGFhNzNmMDQ3ZmQwNjY5OWIwNjk3YTIwMDIzYWViYWMifQ.nlRKhlzBhHVpYejoSkH_S9ZOeAejlhvnL5u-94AzsREIhzuKroJbPp9jEHuvvki5dJozc-FzXx9lfpjT17X6PT0hJOM86QUE05RkmV9WkrVSr8trr1zbHY6dieii9tzj7c01pXsLJTa2FvTonmJAxDteVt_vsZFl7-pRWmyXKLMk4CFv9AZx20-uj5pDLuj-F5IkAk_cpXBuMJYh5PQeNBDk22d5svDTQkuwUAH5N9sssXRzDNdv92snGu4AykpmoPIJeSmc3EY-RW0TB5bAnwXH0E3keAjv84yrNYjnovYn2FRqKbTKxNxN4XUgWU_P0oRYCzckJznwz4tStaYZ2A".to_string(),
            message: "test_123_felipe".to_string()
        };

        let oidc_auth_identity = OIDCAuthIdentity {
            client_id: "739911069797-idp062866964gbndo6693h32tga5cvl1.apps.googleusercontent.com"
                .to_string(),
            issuer: "https://accounts.google.com".to_string(),
            email: "fs.pessina@gmail.com".to_string(),
        };

        assert!(contract.validate_oidc_token(oidc_data, oidc_auth_identity));
    }

    #[test]
    fn validate_facebook_token_should_succeed() {
        let contract = get_test_contract();
        let oidc_data =  OIDCData{
            token: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImFlYzM5NjU4ZTU0NDIzNzY2MTFmMDY5OGE4ODZkZjk2MDZjMDNhN2MifQ.eyJpc3MiOiJodHRwczpcL1wvd3d3LmZhY2Vib29rLmNvbSIsImF1ZCI6IjIxMDM0OTYyMjAwNDU4NDMiLCJzdWIiOiI5MDAxMTQ1NzQzMjcwMjgwIiwiaWF0IjoxNzM2NTIzNDczLCJleHAiOjE3MzY1MjcwNzMsImp0aSI6ImpYZ1kuZjNhMzczNzY3NjRmZDY0NGQyY2YzYmIxYWNjODIzZTRhNzc3ZmZjZGU5NmM1MzIzMzI0MjZkNmIzZDg4OWJiNyIsIm5vbmNlIjoidGVzdF8xMjNfZmVsaXBlIiwiYXRfaGFzaCI6InRwQXo0ZWZUQ2RsVUExcU14aE5BN2ciLCJlbWFpbCI6ImZzLnBlc3NpbmFcdTAwNDBnbWFpbC5jb20iLCJnaXZlbl9uYW1lIjoiRmVsaXBlIiwiZmFtaWx5X25hbWUiOiJQZXNzaW5hIiwibmFtZSI6IkZlbGlwZSBQZXNzaW5hIiwicGljdHVyZSI6Imh0dHBzOlwvXC9wbGF0Zm9ybS1sb29rYXNpZGUuZmJzYnguY29tXC9wbGF0Zm9ybVwvcHJvZmlsZXBpY1wvP2FzaWQ9OTAwMTE0NTc0MzI3MDI4MCZoZWlnaHQ9MTAwJndpZHRoPTEwMCZleHQ9MTczOTExNTQ3MyZoYXNoPUFiYjZSVHNBcndlcXdYTFZWMXpHNUZPcCJ9.lKLW6JvLxyafBYXVNPj0uGc_Fu_DG3yz1k4JjPtBNXsHOL47KBpx3OEtYE19OMMGbUAwX8XakpuDtviTwnMLp-SIvryYyoJQJbP61oph3IoVTXOvBeIBUJZhCCeZdP-CcBsBPFG_wih2jXc-2Zog8apQCkMkoHLO9X2Y3y6d2QAU_5Dn46p5dBfYNcEz-AFmsgb-soHPtEvEhHjyAMu22Be6aHHfmP9HG6QgimbWmro56aZ1EI33ra15jo4yqPInSCgq5SEdVd5ukDZiD_QVAbGOn0VX7SC4m8JbRqLWNpL_6L3DmR0L2Xqd0U15PGtx87gm5DOqa6e7j6R2A2LQJQ".to_string(),
            message: "test_123_felipe".to_string()
        };

        let oidc_auth_identity = OIDCAuthIdentity {
            client_id: "2103496220045843".to_string(),
            issuer: "https://www.facebook.com".to_string(),
            email: "fs.pessina@gmail.com".to_string(),
        };

        assert!(contract.validate_oidc_token(oidc_data, oidc_auth_identity));
    }

    #[test]
    fn validate_google_token_should_fail_signature_invalid() {
        let contract = get_test_contract();
        let oidc_data =  OIDCData{
            token: "eyJhbGciOiJSUzI1NiIsImtpZCI6Ijg5Y2UzNTk4YzQ3M2FmMWJkYTRiZmY5NWU2Yzg3MzY0NTAyMDZmYmEiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiI3Mzk5MTEwNjk3OTctaWRwMDYyODY2OTY0Z2JuZG82NjkzaDMydGdhNWN2bDEuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiI3Mzk5MTEwNjk3OTctaWRwMDYyODY2OTY0Z2JuZG82NjkzaDMydGdhNWN2bDEuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMTc5MDI4NTUzNzMxNTc0MTAzMzAiLCJlbWFpbCI6ImZzLnBlc3NpbmFAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5iZiI6MTczNjUxMTQ1OCwibmFtZSI6IkZlbGlwZSBQZXNzaW5hIiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0pLSmJVeUJWcUNCdjRxVkdPRFNuVlRnTEhQS04wdFZPTUlNWFZpdWtncmQtMHRmZWRVPXM5Ni1jIiwiZ2l2ZW5fbmFtZSI6IkZlbGlwZSIsImZhbWlseV9uYW1lIjoiUGVzc2luYSIsImlhdCI6MTczNjUxMTc1OCwiZXhwIjoxNzM2NTE1MzU4LCJqdGkiOiI4NTQ0YzMwZGQ2MjA3NzM3NDQ1ZjRlMWE1MGYxMjA0Nzk1YmVkMWJmIn0.YrQny7qVn6dWa_ojGPCHJshT_pofwjIFTmhqQA5nR_-T3p0Wi7RCSg4dJ138yTZAxmcwwEzjT3m9oOSKxlzPDRROOdXCOx0ljwgzsTKqq3JuzOB8bRdT3NmY4E9cr4NLzkR-99JQvYeOLV46q_uxytJ20deyE-4OP4qbKhyc_ZILVitJ8Vus5yB68eGLhZwO6Ew9k8FZGy11xJLUuGjhwZ6cg-peFjWaj3uk8H_nN-UyF_iPzhxVcsndyiB6O9h2JS9mEg-Xzj8wuEzRQ1SqTLQjMjMWmZ1KhY7KkQhb8vrGLzk8cuR_fnOKTwv0N7qHjrahLxejBNlmAkfg123Fsg".to_string(),
            message: "".to_string()
        };

        let oidc_auth_identity = OIDCAuthIdentity {
            client_id: "739911069797-idp062866964gbndo6693h32tga5cvl1.apps.googleusercontent.com"
                .to_string(),
            issuer: "https://accounts.google.com".to_string(),
            email: "fs.pessina@gmail.com".to_string(),
        };

        assert!(!contract.validate_oidc_token(oidc_data, oidc_auth_identity));
    }

    #[test]
    fn validate_facebook_token_should_fail_signature_invalid() {
        let contract = get_test_contract();
        let oidc_data =  OIDCData{
            token: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImFlYzM5NjU4ZTU0NDIzNzY2MTFmMDY5OGE4ODZkZjk2MDZjMDNhN2MifQ.eyJpc3MiOiJodHRwczpcL1wvd3d3LmZhY2Vib29rLmNvbSIsImF1ZCI6IjIxMDM0OTYyMjAwNDU4NDMiLCJzdWIiOiI5MDAxMTQ1NzQzMjcwMjgwIiwiaWF0IjoxNzM2NTE0MjU4LCJleHAiOjE3MzY1MTc4NTgsImp0aSI6IjJ5aWUuZmQzOTc0ZjIyMDU2Njk4YWQxMzMyY2IxY2JhOTVhMGJiYzdiZjM0ZDM5YTJjMzAwMmRmZDM1MDk5MTEwNzkzOCIsIm5vbmNlIjoiIiwiYXRfaGFzaCI6Im5LSTB5NTRtUTVSOHJLMXZSNUEtWEEiLCJlbWFpbCI6ImZzLnBlc3NpbmFcdTAwNDBnbWFpbC5jb20iLCJnaXZlbl9uYW1lIjoiRmVsaXBlIiwiZmFtaWx5X25hbWUiOiJQZXNzaW5hIiwibmFtZSI6IkZlbGlwZSBQZXNzaW5hIiwicGljdHVyZSI6Imh0dHBzOlwvXC9wbGF0Zm9ybS1sb29rYXNpZGUuZmJzYnguY29tXC9wbGF0Zm9ybVwvcHJvZmlsZXBpY1wvP2FzaWQ9OTAwMTE0NTc0MzI3MDI4MCZoZWlnaHQ9MTAwJndpZHRoPTEwMCZleHQ9MTczOTEwNjI1OCZoYXNoPUFiYnNqYzdham5ZWXFMYXJMWHdnLVlNTyJ9.VeZRS6yn6wBsAduWn7DabLE01WiGmEBeCTDYJsHbKCsisV6J1Eugym6GN10BYCUxY9yp4wePIpXa-fdbz31HX-HReC-xPLM2DIry4MIx8xgZeNTzoktuEd0v2EHqjChtZOWPKYHtv58HOTojMCUtekOZkVenbGxHh-kritvqkq-l1q8PxOPMrJnOL4c0Ie7-Rl2UJH-doTALCSLa4F6EI1HQgFB8zk8aEN5a_nPq0QJBFzHK8F-4yTy_WqaQ2sgi-rHoE9qaK6SCOTfHcYjPEbX2Y9YM48FV9eoWHaxmb_FF81zd7UEd8WsjOhJj_f9nNLqQKUZG3NgYfs123LTHyQ".to_string(),
            message: "".to_string()
        };

        let oidc_auth_identity = OIDCAuthIdentity {
            client_id: "2103496220045843".to_string(),
            issuer: "https://www.facebook.com".to_string(),
            email: "fs.pessina@gmail.com".to_string(),
        };

        assert!(!contract.validate_oidc_token(oidc_data, oidc_auth_identity));
    }
}
