use anchor_lang::prelude::*;
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use rsa::{pkcs1v15::VerifyingKey, signature::Verifier, BigUint, RsaPublicKey};
use sha2::Sha256;

declare_id!("8KrLertSDNhWZ8hiYiPEeH8UnXs7Q7w9F52pwcbxXBcD");

// #[derive(borsh::BorshSerialize, borsh::BorshDeserialize)]
// pub struct PublicKey {
//     pub kid: String,
//     pub n: String,
//     pub e: String,
//     pub alg: String,
//     pub kty: String,
//     pub use_: String,
// }

#[program]
pub mod contracts {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }

    pub fn initialize_counter(_ctx: Context<InitializeCounter>) -> Result<()> {
        Ok(())
    }

    pub fn increment(ctx: Context<Increment>) -> Result<()> {
        ctx.accounts.counter.count = ctx.accounts.counter.count.checked_add(1).unwrap();
        Ok(())
    }

    pub fn verify(_ctx: Context<Verify>, oidc_token: String, n: String, e: String) -> Result<()> {
        let parts: Vec<&str> = oidc_token.split('.').collect();
        if parts.len() != 3 {
            panic!("Invalid JWT format - token must have 3 parts");
        }
        let (header_b64, payload_b64, sig_b64) = (parts[0], parts[1], parts[2]);

        let n = URL_SAFE_NO_PAD
            .decode(&n)
            .expect("Failed to decode public key modulus");
        let e = URL_SAFE_NO_PAD
            .decode(&e)
            .expect("Failed to decode public key exponent");

        let rsa_pubkey = RsaPublicKey::new(BigUint::from_bytes_be(&n), BigUint::from_bytes_be(&e))
            .expect("Failed to construct RSA public key");

        let verifying_key = VerifyingKey::<Sha256>::new(rsa_pubkey);
        let message = format!("{}.{}", header_b64, payload_b64);
        let signature = URL_SAFE_NO_PAD
            .decode(sig_b64)
            .expect("Failed to decode JWT signature");

        let result = verifying_key
            .verify(
                message.as_bytes(),
                &rsa::pkcs1v15::Signature::try_from(signature.as_slice())
                    .expect("Failed to parse signature"),
            )
            .is_ok();

        msg!("Verification result: {}", result);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

#[derive(Accounts)]
pub struct InitializeCounter<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        space = 8 + Counter::INIT_SPACE,
        payer = payer
    )]
    pub counter: Account<'info, Counter>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Increment<'info> {
    #[account(mut)]
    pub counter: Account<'info, Counter>,
}

#[account]
#[derive(InitSpace)]
pub struct Counter {
    count: u64,
}

#[derive(Accounts)]
pub struct Verify {}
