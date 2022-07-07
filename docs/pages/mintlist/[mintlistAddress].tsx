import React from "react";
import {
  GKeypair,
  GPublicKey,
  GTransaction,
  Solana,
  SolanaClient,
} from "@glow-app/solana-client";
import { Network } from "@glow-app/glow-client";
import { useRouter } from "next/router";
import { ChevronLeftIcon, PlusIcon } from "@heroicons/react/outline";
import useSWR from "swr";
import classNames from "classnames";
import { DateTime } from "luxon";
import { PageLayout } from "../../components/PageLayout";
import { NftokenTypes } from "../../utils/NftokenTypes";
import { useNetworkContext } from "../../components/NetworkContext";
import { NftokenFetcher } from "../../utils/NftokenFetcher";
import { ResponsiveBreakpoint } from "../../utils/style-constants";
import { GlowSignInButton, useGlowContext } from "@glow-app/glow-react";
import { LuxButton, LuxSubmitButton } from "../../components/LuxButton";
import { InteractiveWell } from "../../components/InteractiveWell";
import { FieldArray, Form, Formik } from "formik";
import { LuxInputField } from "../../components/LuxInput";
import { SimpleDropZone } from "../../components/forms/SimpleDropZone";
import { uploadJsonToS3 } from "../../utils/upload-file";
import { NETWORK_TO_RPC } from "../../utils/rpc-types";
import {
  NFTOKEN_MINTLIST_ADD_MINT_INFOS_V1,
  NFTOKEN_MINTLIST_MINT_NFT_V1,
} from "../../utils/nft-borsh";
import {
  LAMPORTS_PER_SOL,
  NFTOKEN_ADDRESS,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_SLOT_HASHES_PUBKEY,
} from "../../utils/constants";
import { useCollectionNfts } from "../../hooks/useCollectionNfts";
import { NftCard } from "../../components/NftCard";
import { SocialHead } from "../../components/SocialHead";
import { ValueList } from "../../components/ValueList";
import { LuxLink } from "../../components/LuxLink";
import { useBoolean } from "../../hooks/useBoolean";

const MAX_NFTS_PER_BATCH = 10;

export default function MintlistPage() {
  const { query } = useRouter();
  const mintlistAddress = query.mintlistAddress as Solana.Address;

  const { user, glowDetected, signOut } = useGlowContext();

  const networkContext = useNetworkContext();
  const network = (query.network || networkContext.network) as Network;

  const { data } = useMintlist({ address: mintlistAddress, network });

  const isAuthority = user && data?.mintlist.authority === user.address;

  const showUploader =
    data && data.mintlist.mint_infos.length < data.mintlist.num_nfts_total;

  return (
    <>
      <PageLayout>
        <SocialHead
          subtitle={data?.mintlist.name ? `${data.mintlist.name}` : "Mintlist"}
        />
        {data && (
          <>
            {isAuthority && (
              <div className="navigation">
                <LuxButton
                  label="Back to Mintlists"
                  icon={<ChevronLeftIcon />}
                  href="/mintlists"
                  iconPlacement="left"
                  rounded
                  variant="link"
                  color="brand"
                />
              </div>
            )}
            <div className="badge">Mintlist</div>
            <h1>{data.mintlist.name}</h1>

            <div className="columns mb-4">
              <div className="collection">
                {data.collection && (
                  <>
                    <h2>Collection</h2>
                    <LuxLink
                      href={`/collection/${data.collection.address}`}
                      query={
                        network !== Network.Mainnet ? { network } : undefined
                      }
                    >
                      <NftCard
                        image={data.collection.image}
                        title={data.collection.name!}
                      />
                    </LuxLink>
                  </>
                )}

                {/* Minting Section */}
                {data.mintlist.mint_infos.length ===
                  data.mintlist.num_nfts_total && (
                  <div className="mt-4">
                    {!glowDetected && (
                      <p>
                        You’ll need to install{" "}
                        <a href="https://glow.app/download" target="_blank">
                          Glow
                        </a>{" "}
                        in order to mint an NFT.
                      </p>
                    )}
                    {glowDetected &&
                      (user ? (
                        <MintButton
                          mintlist={data.mintlist}
                          network={network}
                        />
                      ) : (
                        <GlowSignInButton variant="purple" />
                      ))}
                  </div>
                )}
              </div>

              <div>
                <h2>On-Chain Data</h2>
                <div className="table">
                  <ValueList
                    attributes={[
                      { label: "address", value: data.mintlist.address },
                      { label: "authority", value: data.mintlist.authority },
                      {
                        label: "treasury_sol",
                        value: data.mintlist.treasury_sol,
                      },
                      {
                        label: "go_live_date",
                        value: DateTime.fromISO(
                          data.mintlist.go_live_date
                        ).toLocaleString({
                          dateStyle: "medium",
                          timeStyle: "short",
                        }),
                      },
                      {
                        label: "created_at",
                        value: DateTime.fromISO(
                          data.mintlist.created_at
                        ).toLocaleString({
                          dateStyle: "medium",
                          timeStyle: "short",
                        }),
                      },
                      {
                        label: "metadata_url",
                        value: data.mintlist.metadata_url,
                      },
                      { label: "collection", value: data.mintlist.collection },
                      {
                        label: "price",
                        value:
                          parseInt(data.mintlist.price.lamports) /
                            LAMPORTS_PER_SOL +
                          " SOL",
                      },
                      {
                        label: "minting_order",
                        value: data.mintlist.minting_order,
                      },
                      {
                        label: "nfts_uploaded",
                        value: data.mintlist.mint_infos.length,
                      },
                      {
                        label: "nfts_total",
                        value: data.mintlist.num_nfts_total,
                      },
                      {
                        label: "nfts_minted",
                        value: data.mintlist.num_nfts_redeemed,
                      },
                    ]}
                  />
                </div>
              </div>
            </div>

            <div>
              <h2>NFTs</h2>
              {isAuthority && showUploader && (
                <div className="mb-4">
                  <div className="mb-2">
                    NOTE: You can upload up to {MAX_NFTS_PER_BATCH} NFTs at
                    once.
                  </div>
                  <NftsUploader
                    mintlist={data.mintlist}
                    network={network}
                    onSignOut={signOut}
                  />
                </div>
              )}

              <NftsGrid
                mintInfos={data.mintlist.mint_infos}
                collection={data.mintlist.collection}
                network={network}
              />
            </div>
          </>
        )}
      </PageLayout>
      <style jsx>{`
        .navigation {
          margin-bottom: 2rem;
        }

        .badge {
          font-size: var(--small-font-size);
          font-weight: var(--medium-font-weight);
          background-color: var(--secondary-bg-color);
          max-width: max-content;
          padding: 0.1rem 0.5rem;
          border-radius: 99rem;
          margin-left: -0.5rem;
          margin-bottom: 0.25rem;
          color: var(--secondary-color);
        }

        .columns {
          display: grid;
          grid-template-columns: 20rem 1fr;
          grid-column-gap: 3rem;
        }

        @media (max-width: ${ResponsiveBreakpoint.medium}) {
          img {
            max-width: 24rem;
            margin: 0 auto;
          }

          h1,
          h2 {
            text-align: center;
            margin-bottom: 1.5rem;
          }

          .columns {
            grid-template-columns: 1fr;
            grid-row-gap: 1.5rem;
          }

          .collection {
            // Push the collection section to the bottom.
            order: 1;
          }
        }
      `}</style>
    </>
  );
}

type MintlistAndCollection = {
  mintlist: NftokenTypes.MintlistInfo;
  collection: NftokenTypes.CollectionInfo | null;
};

function useMintlist({
  address,
  network,
}: {
  address: Solana.Address;
  network: Network;
}): {
  data?: MintlistAndCollection | null;
  error: any;
} {
  const swrKey = [address, network];
  const { data, error } = useSWR(swrKey, async () => {
    const mintlist = await NftokenFetcher.getMintlist({ address, network });

    if (!mintlist) {
      return null;
    }

    const collection = await NftokenFetcher.getCollection({
      address: mintlist.collection,
      network,
    });

    return {
      mintlist,
      collection,
    };
  });

  return { data, error };
}

function MintButton({
  mintlist,
  network,
}: {
  mintlist: NftokenTypes.Mintlist;
  network: Network;
}) {
  const minting = useBoolean();

  return (
    <LuxButton
      label="Mint NFT"
      disabled={minting.value}
      onClick={async () => {
        minting.setTrue();

        const { address: wallet } = await window.glow!.connect();

        const recentBlockhash = await SolanaClient.getRecentBlockhash({
          rpcUrl: NETWORK_TO_RPC[network],
        });

        const nftKeypair = GKeypair.generate();

        const tx = GTransaction.create({
          feePayer: wallet,
          recentBlockhash,
          instructions: [
            {
              accounts: [
                // signer
                {
                  address: wallet,
                  signer: true,
                  writable: true,
                },
                // nft
                { address: nftKeypair.address, signer: true, writable: true },
                // mintlist
                { address: mintlist.address, writable: true },
                // treasury_sol
                {
                  address: mintlist.treasury_sol,
                  writable: true,
                },
                // System Program
                {
                  address: GPublicKey.default.toBase58(),
                },
                // Clock Sysvar
                {
                  address: SYSVAR_CLOCK_PUBKEY,
                },
                // SlotHashes
                {
                  address: SYSVAR_SLOT_HASHES_PUBKEY,
                },
              ],
              program: NFTOKEN_ADDRESS,
              data_base64: NFTOKEN_MINTLIST_MINT_NFT_V1.toBuffer({
                ix: null,
              }).toString("base64"),
            },
          ],
          signers: [nftKeypair],
        });

        try {
          await window.glow!.signAndSendTransaction({
            transactionBase64: GTransaction.toBuffer({
              gtransaction: tx,
            }).toString("base64"),
            network: network,
          });
        } catch (err) {
          console.error(err);
        }

        minting.setFalse();
      }}
    />
  );
}

type NftConfig = { name: string; image: string };

type FormData = {
  nfts: NftConfig[];
};

function NftsUploader({
  mintlist,
  network,
  onSignOut,
}: {
  mintlist: NftokenTypes.MintlistInfo;
  network: Network;
  onSignOut: () => void;
}) {
  const availableToUpload =
    mintlist.num_nfts_total - mintlist.mint_infos.length;

  const initialValues: FormData = {
    nfts: [{ name: "", image: "" }],
  };

  return (
    <>
      <InteractiveWell title="Upload NFTs">
        <Formik
          initialValues={initialValues}
          onSubmit={async ({ nfts }, { resetForm }) => {
            const { address: wallet } = await window.glow!.connect();

            const mintInfoArgs: NftokenTypes.MintInfoArg[] = await Promise.all(
              nfts.map(async ({ name, image }) => {
                const { file_url } = await uploadJsonToS3({
                  json: { name, image },
                });

                return { metadata_url: file_url };
              })
            );

            const recentBlockhash = await SolanaClient.getRecentBlockhash({
              rpcUrl: NETWORK_TO_RPC[network],
            });

            const tx = GTransaction.create({
              feePayer: wallet,
              recentBlockhash,
              instructions: [
                {
                  accounts: [
                    // mintlist
                    {
                      address: mintlist.address,
                      signer: false,
                      writable: true,
                    },
                    // authority
                    { address: wallet, signer: true, writable: true },
                  ],
                  program: NFTOKEN_ADDRESS,
                  data_base64: NFTOKEN_MINTLIST_ADD_MINT_INFOS_V1.toBuffer({
                    current_nft_count: mintlist.mint_infos.length,
                    ix: null,
                    mint_infos: mintInfoArgs,
                  }).toString("base64"),
                },
              ],
            });

            try {
              await window.glow!.signAndSendTransaction({
                transactionBase64: GTransaction.toBuffer({
                  gtransaction: tx,
                }).toString("base64"),
                network: network,
              });
              resetForm({ values: initialValues });
            } catch (err) {
              console.error(err);
            }
          }}
        >
          {({ values, isValid }) => (
            <Form>
              <div className="grid">
                <FieldArray name="nfts">
                  {({ insert }) => (
                    <>
                      {values.nfts.map((_, index) => (
                        <div key={index}>
                          <div className="mb-4">
                            <LuxInputField
                              placeholder="Name"
                              name={`nfts.${index}.name`}
                              required
                            />
                          </div>

                          <SimpleDropZone
                            label="NFT Image"
                            fieldName={`nfts.${index}.image`}
                            size={280}
                          />
                        </div>
                      ))}
                      {values.nfts.length <= MAX_NFTS_PER_BATCH &&
                        values.nfts.length < availableToUpload && (
                          <button
                            type="button"
                            className="add-nft-button animated"
                            onClick={() =>
                              insert(values.nfts.length, {
                                name: "",
                                image: "",
                              })
                            }
                          >
                            <PlusIcon
                              style={{
                                width: "2rem",
                                height: "2rem",
                              }}
                            />
                          </button>
                        )}
                    </>
                  )}
                </FieldArray>
              </div>
              <div className="mt-4 flex-center spread">
                <LuxSubmitButton
                  label={`Upload ${values.nfts.length} NFT${
                    values.nfts.length !== 1 ? "s" : ""
                  }`}
                  rounded
                  color="brand"
                  disabled={!(isValid && values.nfts.every((nft) => nft.image))}
                />
                <LuxButton
                  label="Disconnect Wallet"
                  onClick={onSignOut}
                  color="secondary"
                  size="small"
                  variant="link"
                />
              </div>
            </Form>
          )}
        </Formik>
      </InteractiveWell>
      <style jsx>{`
        .grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          column-gap: 1rem;
          row-gap: 2rem;
        }

        .add-nft-button {
          border: 1px solid var(--primary-border-color);
          border-radius: var(--border-radius);
          background-color: var(--faint-gray);
        }
        .add-nft-button:hover {
          background-color: var(--pale-gray);
        }
      `}</style>
    </>
  );
}

function NftsGrid({
  mintInfos,
  collection,
  network,
}: {
  mintInfos: NftokenTypes.MintInfo[];
  collection: Solana.Address;
  network: Network;
}) {
  const { data: metadataMap } = useMintInfosMetadata(mintInfos);

  const { data: mintedNfts } = useCollectionNfts({
    collectionAddress: collection,
    network,
  });

  const nftsData: Map<string, NftokenTypes.NftInfo> = (mintedNfts ?? []).reduce(
    (result, nft) => {
      result.set(nft.metadata_url, nft);

      return result;
    },
    new Map()
  );

  if (!mintInfos.length) {
    return <div>No NFTs have been uploaded to this mintlist yet.</div>;
  }

  const mintInfosWithMetadata = mintInfos
    .filter(({ metadata_url }) => metadataMap.get(metadata_url))
    .map((mintInfo) => ({
      ...mintInfo,
      metadata: metadataMap.get(mintInfo.metadata_url)!,
    }));

  return (
    <>
      <div className="grid">
        {mintInfosWithMetadata.map((mintInfo) => {
          const nft = nftsData.get(mintInfo.metadata_url);

          return nft ? (
            <LuxLink
              href={`/nft/${nft.address}`}
              query={network !== Network.Mainnet ? { network } : undefined}
              key={mintInfo.metadata_url}
            >
              <NftCard
                image={mintInfo.metadata.image}
                title={mintInfo.metadata.name}
                subtitle={
                  <div className={classNames(["subtitle", "status-minted"])}>
                    Minted
                  </div>
                }
              />
            </LuxLink>
          ) : (
            <NftCard
              key={mintInfo.metadata_url}
              image={mintInfo.metadata.image}
              title={mintInfo.metadata.name}
              subtitle={
                <div className={classNames(["subtitle", "status-available"])}>
                  Available
                </div>
              }
            />
          );
        })}
      </div>

      <style jsx>{`
        .grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          column-gap: 1rem;
          row-gap: 2rem;
        }

        .subtitle {
          font-size: 0.8rem;
        }

        .status-available {
          color: var(--success-color);
        }

        .status-minted {
          color: var(--secondary-color);
        }
      `}</style>
    </>
  );
}

function useMintInfosMetadata(mintInfos: NftokenTypes.MintInfo[]): {
  data: Map<string, NftokenTypes.Metadata | null>;
  error: unknown;
} {
  const metadataUrls = mintInfos.map((mintInfo) => mintInfo.metadata_url);

  const swrKey = ["mintInfos", ...metadataUrls];

  const { data, error } = useSWR(swrKey, async () => {
    return await NftokenFetcher.getMetadataMap({
      urls: metadataUrls,
    });
  });

  return { data: data ?? new Map(), error };
}
