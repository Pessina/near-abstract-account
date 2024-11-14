use interfaces::ethereum_auth::EthereumData;
use interfaces::solana_auth::SolanaData;
use interfaces::webauthn_auth::WebAuthnData;
use near_sdk::ext_contract;
use near_sdk::Gas;

pub const VALIDATE_P256_SIGNATURE_GAS: Gas = Gas::from_tgas(30);
pub const VALIDATE_ETH_SIGNATURE_GAS: Gas = Gas::from_tgas(12);

#[ext_contract(webauthn_auth)]
pub trait WebAuthnAuth {
    fn validate_p256_signature(
        &self,
        webauthn_data: WebAuthnData,
        compressed_public_key: String,
    ) -> bool;
}

#[ext_contract(ethereum_auth)]
pub trait EthereumAuth {
    fn validate_eth_signature(&self, eth_data: EthereumData, compressed_public_key: String) -> bool;
}

#[ext_contract(solana_auth)]
pub trait SolanaAuth {
    fn validate_solana_signature(&self, solana_data: SolanaData, public_key: String) -> bool;
}
