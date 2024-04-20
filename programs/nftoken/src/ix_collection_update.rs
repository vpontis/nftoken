use crate::account_types::{CollectionAccount, COLLECTION_BASE_ACCOUNT_SIZE};
use crate::errors::NftokenError;
use anchor_lang::prelude::*;

///  # Update Collection
///
/// Update the collection information on chain.
pub fn collection_update_inner(
    ctx: Context<CollectionUpdate>,
    args: CollectionUpdateArgs,
) -> Result<()> {
    let collection = &mut ctx.accounts.collection;

    let action_allowed = collection.authority.key() == ctx.accounts.authority.key();
    require!(action_allowed, NftokenError::Unauthorized);
    require!(collection.authority_can_update, NftokenError::Unauthorized);

    collection.metadata_url = args.metadata_url;
    collection.authority_can_update = args.authority_can_update;

    Ok(())
}

#[derive(Accounts)]
#[instruction(args: CollectionUpdateArgs)]
pub struct CollectionUpdate<'info> {
    #[account(mut, has_one = authority, realloc = COLLECTION_BASE_ACCOUNT_SIZE + args.metadata_url.len(), realloc::payer = authority, realloc::zero = false)]
    pub collection: Account<'info, CollectionAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub struct CollectionUpdateArgs {
    pub metadata_url: String,
    pub authority_can_update: bool,
}
