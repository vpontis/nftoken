import assert from "assert";
import * as anchor from "@project-serum/anchor";
import { Program, web3, BN } from "@project-serum/anchor";
import { Nftoken as NftokenTypes } from "../target/types/nftoken";
import { createMintlist, getMintlistData } from "./utils/mintlist";
import { generateAlphaNumericString, strToArr } from "./utils/test-utils";

describe("mintlist_add_mint_infos", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Nftoken as Program<NftokenTypes>;

  it("should populate mintlist with mintInfo's", async () => {
    const treasuryKeypair = web3.Keypair.generate();
    const goLiveDate = new BN(Math.floor(Date.now() / 1000));
    const price = new BN(web3.LAMPORTS_PER_SOL);
    const numTotalNfts = 1000;

    const { mintlistAddress } = await createMintlist({
      treasury: treasuryKeypair.publicKey,
      goLiveDate,
      price,
      numTotalNfts,
      program,
    });

    // This is maximum number of mintInfo's that fits in a transaction.
    const batchSize = 6;

    // First batch.

    const mintInfos1 = Array.from({ length: batchSize }, (_, i) => {
      return createMintInfoArg(i);
    });

    await program.methods
      .mintlistAddMintInfos(mintInfos1)
      .accounts({
        mintlist: mintlistAddress,
        creator: provider.wallet.publicKey,
      })
      .rpc();

    let mintlistData = await getMintlistData(program, mintlistAddress);

    assert.equal(mintlistData.mintInfos.length, batchSize);

    for (const [i, mintInfo] of mintlistData.mintInfos.entries()) {
      assert.deepEqual(mintInfo.metadataUrl, mintInfos1[i].metadataUrl);
    }

    // Second batch.

    const mintInfos2 = Array.from({ length: batchSize }, (_, i) => {
      return createMintInfoArg(mintInfos1.length + i);
    });

    await program.methods
      .mintlistAddMintInfos(mintInfos2)
      .accounts({
        mintlist: mintlistAddress,
        creator: provider.wallet.publicKey,
      })
      .rpc();

    mintlistData = await getMintlistData(program, mintlistAddress);

    assert.equal(mintlistData.mintInfos.length, batchSize * 2);

    for (const [i, mintInfo] of mintlistData.mintInfos.entries()) {
      if (i < batchSize) {
        assert.deepEqual(mintInfo.metadataUrl, mintInfos1[i].metadataUrl);
      } else if (i < batchSize * 2) {
        assert.deepEqual(
          mintInfo.metadataUrl,
          mintInfos2[i - batchSize].metadataUrl
        );
      }
    }

    // TODO: Test full population of the mintlist.
  });
});

export function createMintInfoArg(index: number) {
  return {
    metadataUrl: strToArr(`generateAlphaNumericString(16)--${index}`, 64),
  };
}