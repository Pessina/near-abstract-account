use interfaces::auth::{
    oidc::{OIDCAuthIdentity, OIDCValidationData},
    wallet::WalletValidationData,
    webauthn::WebAuthnValidationData,
};
use near_sdk::ext_contract;
use near_sdk::Gas;

pub const VALIDATE_P256_SIGNATURE_GAS: Gas = Gas::from_tgas(30);
pub const VALIDATE_ETH_SIGNATURE_GAS: Gas = Gas::from_tgas(12);

#[ext_contract(webauthn_auth)]
pub trait WebAuthnAuth {
    fn verify_p256(
        &self,
        webauthn_data: WebAuthnValidationData,
        compressed_public_key: String,
    ) -> bool;
}

#[ext_contract(ethereum_auth)]
pub trait EthereumAuth {
    fn verify(&self, eth_data: WalletValidationData, compressed_public_key: String) -> bool;
}

#[ext_contract(solana_auth)]
pub trait SolanaAuth {
    fn verify(&self, solana_data: WalletValidationData, public_key: String) -> bool;
}

#[ext_contract(oidc_auth)]
pub trait OidcAuth {
    fn verify(&self, oidc_data: OIDCValidationData, oidc_auth_identity: OIDCAuthIdentity) -> bool;
}
