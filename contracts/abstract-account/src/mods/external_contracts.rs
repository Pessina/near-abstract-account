use interfaces::webauthn_auth::WebAuthnData;
use near_sdk::ext_contract;
use near_sdk::Gas;

pub const VALIDATE_P256_SIGNATURE_GAS: Gas = Gas::from_tgas(30);

#[ext_contract(webauthn_auth)]
pub trait WebAuthnAuth {
    fn validate_p256_signature(
        &self,
        webauthn_data: WebAuthnData,
        compressed_public_key: String,
    ) -> bool;
}
