import assert from "assert";
import * as anchor from "@project-serum/anchor";
import { Program, web3, BN } from "@project-serum/anchor";
import { Nftoken as NftokenTypes } from "../target/types/nftoken";
import { createMintlist } from "./utils/mintlist";

describe("mintlist_create", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Nftoken as Program<NftokenTypes>;

  it("should create a mintlist", async () => {
    const treasuryKeypair = web3.Keypair.generate();
    const goLiveDate = new BN(Math.floor(Date.now() / 1000));
    const price = new BN(web3.LAMPORTS_PER_SOL);
    const numTotalNfts = 10000;

    const { mintlistData } = await createMintlist({
      treasury: treasuryKeypair.publicKey,
      goLiveDate,
      price,
      numTotalNfts,
      program,
    });

    assert.equal(mintlistData.version, 1);
    assert.deepEqual(mintlistData.creator, provider.wallet.publicKey);
    assert.deepEqual(mintlistData.treasurySol, treasuryKeypair.publicKey);
    assert.deepEqual(mintlistData.goLiveDate.toNumber(), goLiveDate.toNumber());
    assert.equal(mintlistData.price.toNumber(), price.toNumber());
    assert.deepEqual(mintlistData.numTotalNfts, numTotalNfts);
    assert.deepEqual(mintlistData.numNftsRedeemed, 0);
    assert.deepEqual(mintlistData.mintingOrder, { sequential: {} });
    assert.deepEqual(mintlistData.collection, web3.PublicKey.default);
    assert(mintlistData.createdAt.toNumber() <= Date.now() / 1000);
  });
});