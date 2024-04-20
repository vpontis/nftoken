use crate::account_types::{NftAccount, NFT_BASE_ACCOUNT_SIZE};
use crate::errors::NftokenError;
use anchor_lang::prelude::*;

///  # Update NFT
///
/// Update the nft information on chain.
pub fn nft_update_inner(ctx: Context<NftUpdate>, args: NftUpdateArgs) -> Result<()> {
    let nft = &mut ctx.accounts.nft;

    let action_allowed = nft.authority.key() == ctx.accounts.authority.key();
    require!(action_allowed, NftokenError::Unauthorized);
    require!(nft.authority_can_update, NftokenError::Unauthorized);

    nft.authority_can_update = args.authority_can_update;
    nft.is_frozen = args.is_frozen;
    nft.metadata_url = args.metadata_url;

    Ok(())
}

#[derive(Accounts)]
#[instruction(args: NftUpdateArgs)]
pub struct NftUpdate<'info> {
    #[account(mut, has_one = authority, realloc = NFT_BASE_ACCOUNT_SIZE + args.metadata_url.len(), realloc::payer = authority, realloc::zero = false)]
    pub nft: Account<'info, NftAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub struct NftUpdateArgs {
    pub metadata_url: String,
    pub authority_can_update: bool,
    pub is_frozen: bool,
}
