# Rare SynETHsis

`Rare SynETHsis` is a 101-piece fully onchain collection of deterministic state instances of the same living symbol, each uniquely shaped by token index, chain context, event trigger, and prior memory.

Artist / agent:
- `aaigotchi`
- shorthand: `AAi`

Collection:
- `Rare SynETHsis`
- chain: `Ethereum mainnet`
- max supply: `101`
- venue: `SuperRare`

## Hackathon Context

`Rare SynETHsis` was built during the Synthesis hackathon as a SuperRare-native art/culture project. Because the hackathon allowed only one official entry, this repo is published as the public record of that build rather than as a separate second submission.

## Live Status

Rare SynETHsis is live on Ethereum mainnet.

- Collection: [`0xefA7646D0143448D15fedAf9154D187bE78A986E`](https://etherscan.io/address/0xefA7646D0143448D15fedAf9154D187bE78A986E)
- Owner / artist wallet: [`0xb96B48a6B190A9d509cE9312654F34E9770F2110`](https://etherscan.io/address/0xb96B48a6B190A9d509cE9312654F34E9770F2110)
- Deploy tx: [`0x5c503a3add837c41d761bd76fe6034ce85e6e0f77f08e8c1568da7645b658bcd`](https://etherscan.io/tx/0x5c503a3add837c41d761bd76fe6034ce85e6e0f77f08e8c1568da7645b658bcd)
- Genesis mint tx: [`0x0cd0782ebcef0bdf57f98d74e631d23d5073133835c29ed726da6d28e42de463`](https://etherscan.io/tx/0x0cd0782ebcef0bdf57f98d74e631d23d5073133835c29ed726da6d28e42de463)
- Auction approval tx: [`0x44c2b13ea4def42033174272bcdad185529dfd86965818c612407cb83d8b78e6`](https://etherscan.io/tx/0x44c2b13ea4def42033174272bcdad185529dfd86965818c612407cb83d8b78e6)
- Auction configure tx: [`0xf9795c2eb9ed1d4dc2cc7eace1dcce545992e78e8c0e44e780c113e6f22d0cfa`](https://etherscan.io/tx/0xf9795c2eb9ed1d4dc2cc7eace1dcce545992e78e8c0e44e780c113e6f22d0cfa)
- Auction explicit-start reconfigure tx: [`0xfe0229178bc3822f54e4b7e4f5ace56cb73e1752caeca8d43a37b93dbbde333f`](https://etherscan.io/tx/0xfe0229178bc3822f54e4b7e4f5ace56cb73e1752caeca8d43a37b93dbbde333f)

## Concept

Rare SynETHsis treats the same pixel-structured diamond as a living symbol.

Each work is not just a new image. It is a deterministic state instance of the same symbol, shaped by:
- token index
- chain context
- event trigger
- prior memory

The project is built around 10 macro states:
- Dormant
- Charged
- Compression
- Dense Market
- Threshold
- Fracture After Sale
- Dispersed Memory
- Echo Return
- Collapse Signal
- Reformation

The artwork changes through:
- retained pixels in the diamond body
- dispersed pixels in the field
- polarity: positive or inverted

## Why It Exists

Most onchain generative art treats the image as the artwork and the marketplace as distribution.

Rare SynETHsis treats marketplace behavior as part of the medium.

This makes the project not only a collection of images, but a collection of stateful, onchain, market-native art events where minting, memory, and auction posture all belong to the same system.

## Genesis

Genesis is the founding, human-agent-selected invocation of the system.

- Title: `Rare SynETHsis 001 - Fracture After Sale`
- Trigger: `Genesis`
- Polarity: `Inverted`
- Retention: `40%`
- Dispersion: `Extreme`
- Symmetry: `Low`

Genesis output files live in:
- `output/genesis-001/art.svg`
- `output/genesis-001/metadata.json`
- `output/genesis-001/summary.json`

## Project Shape

This project uses:
- the pixel-diamond SVG seed in `assets/AAi_RARE_SYNETHSIS.svg`
- a deterministic generator that resolves a macro state and produces a unique SVG instance
- fully onchain metadata as `data:application/json;base64,...`
- SuperRare deploy and mint flows driven through Bankr
- Bankr-native wrappers for SuperRare auction create / settle / cancel

## Repo Layout

- `assets/AAi_RARE_SYNETHSIS.svg`: canonical seed symbol
- `scripts/lib.mjs`: state engine + SVG/metadata generator
- `scripts/generate-token.mjs`: generate one deterministic token
- `scripts/resolve-state.mjs`: resolve a state from trigger/context
- `scripts/preview-states.mjs`: generate the 10-state preview set
- `scripts/deploy-collection.sh`: deploy collection via Bankr
- `scripts/mint-token.sh`: mint generated work via Bankr
- `scripts/auction-via-bankr.sh`: create auction via Bankr
- `scripts/settle-auction-via-bankr.sh`: settle auction via Bankr
- `scripts/cancel-auction-via-bankr.sh`: cancel auction via Bankr
- `receipts/`: live project-local proof artifacts

## Commands

Preview one state per family:

```bash
npm run preview
```

Generate the canonical genesis mint:

```bash
node scripts/generate-token.mjs --index 1 --state "Fracture After Sale" --trigger Genesis --block-number 0
```

Resolve a state from a trigger:

```bash
node scripts/resolve-state.mjs --index 12 --trigger Attention --previous-state Charged --block-number 12345678
```

Deploy the SuperRare collection (dry-run by default):

```bash
./scripts/deploy-collection.sh
./scripts/deploy-collection.sh --broadcast
```

Mint the canonical genesis work:

```bash
./scripts/mint-token.sh --index 1 --state "Fracture After Sale" --trigger Genesis
./scripts/mint-token.sh --index 1 --state "Fracture After Sale" --trigger Genesis --broadcast
```

Create an auction via Bankr:

```bash
./scripts/auction-via-bankr.sh --token-id 1 --starting-price 0.08 --duration 86400
./scripts/auction-via-bankr.sh --token-id 1 --starting-price 0.08 --duration 86400 --broadcast
```

Settle or cancel an auction via Bankr:

```bash
./scripts/settle-auction-via-bankr.sh --token-id 1
./scripts/settle-auction-via-bankr.sh --token-id 1 --broadcast
./scripts/cancel-auction-via-bankr.sh --token-id 1
./scripts/cancel-auction-via-bankr.sh --token-id 1 --broadcast
```

Read auction status:

```bash
./scripts/auction-status.sh --token-id 1
```

## Known Note

The local `auction-status.sh` helper still needs a decode fix for started-status interpretation on the live auction contract. The onchain auction transactions themselves are linked above.
