use std::convert::TryInto;

use anchor_lang::prelude::*;
use anchor_lang::solana_program;
use anchor_lang::solana_program::system_instruction;
use anchor_lang::solana_program::sysvar::{slot_hashes, SysvarId};
use arrayref::array_ref;

use crate::account_types::*;
use crate::constants::*;
use crate::errors::*;

/// # Mint NFT
///
/// This lets you mint an NFT from a mintlist.
pub fn mintlist_mint_nft_inner(ctx: Context<MintlistMintNft>) -> Result<()> {
    let mintlist = &mut ctx.accounts.mintlist;
    let current_time = ctx.accounts.clock.unix_timestamp;
    let signer = &ctx.accounts.signer;
    let treasury = &ctx.accounts.treasury_sol;

    // TODO: take some money here to punish bots?

    // Require that the mintlist is configured and ready for minting.
    require!(
        mintlist.is_mintable(current_time),
        NftokenError::Unauthorized
    );

    // Pay for the NFT by transferring SOL from the signer / minter → the treasury.
    // We check that the `treasury.key == mintlist.treasury_sol`.
    let ix = system_instruction::transfer(&signer.key(), &treasury.key(), mintlist.price);
    solana_program::program::invoke(&ix, &[signer.to_account_info().clone(), treasury.clone()])?;

    let mintlist_account_info = mintlist.to_account_info();
    let mut mintlist_data = mintlist_account_info.data.borrow_mut();

    // Find the `mint_info` for the NFT we are going to mint
    let slothashes = &ctx.accounts.slothashes;
    require!(
        slothashes.key() == slot_hashes::SlotHashes::id(),
        NftokenError::Unauthorized
    );

    let mint_info_index = get_mint_info_index(&*mintlist, &mut mintlist_data, slothashes);
    msg!("Got mint_info_index {}", mint_info_index);
    let mint_info_pos = MintlistAccount::size(mint_info_index.try_into().unwrap());

    // We make sure that we haven't minted this yet.
    require!(
        mintlist_data[mint_info_pos] == 0,
        NftokenError::Unauthorized
    );

    // The first byte of the `mint_info` is `minted`, so this sets minted = true
    mintlist_data[mint_info_pos] = 1;

    let mint_info_size = MintInfo::size();
    let mint_info_data = &mut &mintlist_data[mint_info_pos..(mint_info_pos + mint_info_size)];
    let mint_info: MintInfo = AnchorDeserialize::deserialize(mint_info_data)?;

    // Configure the minted NFT
    let nft = &mut ctx.accounts.nft;
    nft.version = 1;
    nft.collection = mintlist.collection;
    nft.creator = mintlist.creator;
    nft.holder = ctx.accounts.signer.key();
    nft.metadata_url = mint_info.metadata_url;
    nft.creator_can_update = true;

    mintlist.num_nfts_redeemed = mintlist.num_nfts_redeemed.checked_add(1).unwrap();

    Ok(())
}

fn get_mint_info_index(
    mintlist: &Account<MintlistAccount>,
    mintlist_data: &mut [u8],
    slothashes: &AccountInfo,
) -> usize {
    return match mintlist.minting_order {
        MintingOrder::Sequential => mintlist.num_nfts_redeemed.try_into().unwrap(),
        MintingOrder::Random => {
            // This is where randomness is introduced into the minting process so that a minter can't
            // predict what they will mint. A pseudorandom number is generated by looking at a slice
            // of the recent blockhash.
            //
            // We then convert the pseudorandom number → an index in the mintlist by the following
            // logic:
            // 1. we take the random number (mod) nfts available that gives us `available_index`.
            //    this is the index withing the available nfts
            // 2. then we have to iterate over all mint infos to find the index within the mint_infos
            //    that corresponds to the `available_index`
            //
            // TODO: spend more time verifying this code since it was inspired by Metaplex Candy Machine
            let nfts_available = mintlist.num_nfts_total - mintlist.num_nfts_redeemed;

            let recent_hash_data = slothashes.data.borrow();

            // TODO: where does 12 come from? also this randomness isn't very good since
            //       we are mapping a uniform distribution w/ a big range into a uniform distribution
            //       with a smaller range by just doing modulus, but I don't think that will work...
            let most_recent = array_ref![recent_hash_data, 12, 8];

            let index = u64::from_le_bytes(*most_recent);

            // This gets us the NFT we are going to choose out of all NFTs that are available.
            // Note: this is *not* the index of the NFT in the mintlist.mint_infos array since
            // some mint infos will have already been minted and we will skip over them.
            let available_index: usize = index
                .checked_rem(nfts_available as u64)
                .unwrap()
                // We can cast from u64 → usize since we have done mod nfts_available which is u16
                .try_into()
                .unwrap();
            msg!("Got available_index {}", available_index);

            let mut mint_info_pos = MintlistAccount::size(0);

            let mut nft_index: usize = 0;
            let mut available_nfts_seen: usize = 0;

            for _i in 0..mintlist.num_nfts_total {
                if mintlist_data[mint_info_pos] == 0 {
                    if available_nfts_seen == available_index {
                        break;
                    }

                    // This mint_info has not been minted and so it is available
                    available_nfts_seen = available_nfts_seen.checked_add(1).unwrap();
                }

                nft_index = nft_index.checked_add(1).unwrap();
                mint_info_pos = mint_info_pos.checked_add(MintInfo::size()).unwrap();
            }

            msg!("Got nft_index {}", nft_index);
            nft_index
        }
    };
}

#[derive(Accounts)]
pub struct MintlistMintNft<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(init, payer = signer, space = NFT_ACCOUNT_SIZE)]
    pub nft: Account<'info, NftAccount>,

    #[account(mut, has_one = treasury_sol)]
    pub mintlist: Account<'info, MintlistAccount>,

    // TODO: make sure that we are checking the account address properly
    /// CHECK: we don't care what type this is, but we need to make sure that it matches `mintlist.treasury_sol`
    #[account(mut)]
    pub treasury_sol: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
    pub clock: Sysvar<'info, Clock>,

    // This is deprecated, but unfortunately there isn't a good replacement to get randomness on
    // Solana. https://github.com/solana-labs/solana/issues/1558
    // This is what Metaplex uses and they are pretty slow to fix things, so if Solana deprecates
    // this, we will just need to fix it before Metaplex (since they will ask Solana not to remove
    // it until they fix their Candy Machines).
    /// CHECK: account constraints checked in account trait
    #[account(address = slot_hashes::SlotHashes::id())]
    pub slothashes: AccountInfo<'info>,
}
