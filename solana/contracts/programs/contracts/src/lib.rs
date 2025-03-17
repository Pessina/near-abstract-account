use anchor_lang::prelude::*;

declare_id!("4bGmWPXzFXWJABf5YV5KaStvnpPuvFBxVxB49ssqZHZL");

#[program]
pub mod contracts {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
