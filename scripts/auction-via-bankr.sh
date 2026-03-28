#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=auction-bankr-lib.sh
source "$SCRIPT_DIR/auction-bankr-lib.sh"

require_bin cast
require_bin jq
require_bin curl

TOKEN_ID=""
STARTING_PRICE_ETH=""
DURATION_SECONDS=""
CHAIN_OVERRIDE=""
CONTRACT_MODE_OVERRIDE="own-deployed"
COLLECTION_OVERRIDE=""
DEPLOY_RECEIPT_OVERRIDE=""
SELLER_OVERRIDE=""
CURRENCY_ADDRESS="$ETH_ADDRESS"
START_TIME="0"
SKIP_APPROVAL=0
NOTE_OVERRIDE=""
DRY_RUN_MODE="${DRY_RUN:-1}"
BANKR_SUBMIT_TIMEOUT_SECONDS="${BANKR_SUBMIT_TIMEOUT_SECONDS:-60}"
RECEIPT_WAIT_TIMEOUT_SECONDS="${RECEIPT_WAIT_TIMEOUT_SECONDS:-300}"
RECEIPT_POLL_INTERVAL_SECONDS="${RECEIPT_POLL_INTERVAL_SECONDS:-5}"

usage() {
  cat <<USAGE
Usage:
  ./scripts/auction-via-bankr.sh --token-id <id> --starting-price <eth> --duration <seconds> [--contract-mode ownership-given|own-deployed] [--contract <address>] [--deploy-receipt <path>] [--seller <address>] [--currency <address>] [--start-time <unix-seconds>] [--skip-approval] [--chain mainnet|sepolia|base|base-sepolia] [--broadcast] [--note <text>]
USAGE
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --token-id|--index)
      TOKEN_ID="${2:-}"
      shift 2
      ;;
    --starting-price)
      STARTING_PRICE_ETH="${2:-}"
      shift 2
      ;;
    --duration)
      DURATION_SECONDS="${2:-}"
      shift 2
      ;;
    --contract-mode)
      CONTRACT_MODE_OVERRIDE="${2:-}"
      shift 2
      ;;
    --contract)
      COLLECTION_OVERRIDE="${2:-}"
      shift 2
      ;;
    --deploy-receipt)
      DEPLOY_RECEIPT_OVERRIDE="${2:-}"
      shift 2
      ;;
    --seller)
      SELLER_OVERRIDE="${2:-}"
      shift 2
      ;;
    --currency)
      CURRENCY_ADDRESS="${2:-}"
      shift 2
      ;;
    --start-time)
      START_TIME="${2:-}"
      shift 2
      ;;
    --skip-approval)
      SKIP_APPROVAL=1
      shift
      ;;
    --chain)
      CHAIN_OVERRIDE="${2:-}"
      shift 2
      ;;
    --note)
      NOTE_OVERRIDE="${2:-}"
      shift 2
      ;;
    --broadcast)
      DRY_RUN_MODE=0
      shift
      ;;
    --dry-run)
      DRY_RUN_MODE=1
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      err "Unknown argument: $1"
      ;;
  esac
done

[ -n "$TOKEN_ID" ] || err "--token-id is required"
[ -n "$STARTING_PRICE_ETH" ] || err "--starting-price is required"
[ -n "$DURATION_SECONDS" ] || err "--duration is required"
[[ "$TOKEN_ID" =~ ^[0-9]+$ ]] || err "--token-id must be a whole number"
[[ "$DURATION_SECONDS" =~ ^[0-9]+$ ]] || err "--duration must be a whole number of seconds"
[[ "$START_TIME" =~ ^[0-9]+$ ]] || err "--start-time must be a whole number"

load_config
apply_auction_chain_defaults "$CHAIN_OVERRIDE"
resolve_collection_contract "$CONTRACT_MODE_OVERRIDE" "$COLLECTION_OVERRIDE" "$DEPLOY_RECEIPT_OVERRIDE"
COLLECTION_CONTRACT="$RESOLVED_COLLECTION_CONTRACT"
STARTING_PRICE_WEI="$(cast to-wei "$STARTING_PRICE_ETH" ether)"
AUCTION_TYPE="$(read_auction_type)"
SELLER_ADDRESS="$(infer_seller_address "$SELLER_OVERRIDE" "$COLLECTION_CONTRACT" "$TOKEN_ID")"
[ -n "$SELLER_ADDRESS" ] || err "Unable to resolve seller address. Pass --seller explicitly or use a deploy receipt that includes ownerAddress."
CURRENT_OWNER="$(read_token_owner_onchain "$COLLECTION_CONTRACT" "$TOKEN_ID")"
APPROVAL_STATUS="$(approval_status_for_owner "$SELLER_ADDRESS" "$COLLECTION_CONTRACT")"
NEEDS_APPROVAL="false"
if [ "$SKIP_APPROVAL" != "1" ] && [ "$APPROVAL_STATUS" != "true" ]; then
  NEEDS_APPROVAL="true"
fi
EFFECTIVE_START_TIME="$START_TIME"
if [ "$EFFECTIVE_START_TIME" = "0" ]; then
  EFFECTIVE_START_TIME="$(date +%s)"
fi

CONFIGURE_CALLDATA="$(cast calldata 'configureAuction(bytes32,address,uint256,uint256,address,uint256,uint256,address[],uint8[])' \
  "$AUCTION_TYPE" \
  "$COLLECTION_CONTRACT" \
  "$TOKEN_ID" \
  "$STARTING_PRICE_WEI" \
  "$CURRENCY_ADDRESS" \
  "$DURATION_SECONDS" \
  "$EFFECTIVE_START_TIME" \
  "[$SELLER_ADDRESS]" \
  '[100]')"
APPROVAL_CALLDATA="$(cast calldata 'setApprovalForAll(address,bool)' "$AUCTION_CONTRACT" true)"
DESCRIPTION_BASE="${NOTE_OVERRIDE:-Rare SynETHsis auction via aaigotchi}"

printf 'SuperRare auction preview\n'
printf '  Chain: %s (%s)\n' "$CHAIN" "$CHAIN_ID"
printf '  Auction house: %s\n' "$AUCTION_CONTRACT"
printf '  Collection: %s\n' "$COLLECTION_CONTRACT"
printf '  Token ID: %s\n' "$TOKEN_ID"
printf '  Seller split: %s (100%%)\n' "$SELLER_ADDRESS"
printf '  Current owner: %s\n' "${CURRENT_OWNER:-unknown}"
printf '  Starting price (ETH): %s\n' "$STARTING_PRICE_ETH"
printf '  Starting price (wei): %s\n' "$STARTING_PRICE_WEI"
printf '  Duration: %s seconds\n' "$DURATION_SECONDS"
printf '  Requested start time: %s\n' "$START_TIME"
printf '  Effective start time: %s\n' "$EFFECTIVE_START_TIME"
printf '  Currency: %s\n' "$CURRENCY_ADDRESS"
printf '  Auction type: %s\n' "$AUCTION_TYPE"
printf '  Approval status: %s\n' "$APPROVAL_STATUS"
printf '  Approval needed: %s\n' "$NEEDS_APPROVAL"
printf '  Calldata: %s...\n' "${CONFIGURE_CALLDATA:0:74}"
printf '  Dry run: %s\n' "$DRY_RUN_MODE"

if [ "$DRY_RUN_MODE" != "0" ]; then
  exit 0
fi

APPROVAL_TX_HASH=""
APPROVAL_BLOCK=""
if [ "$NEEDS_APPROVAL" = "true" ]; then
  submit_bankr_contract_call "$COLLECTION_CONTRACT" "$APPROVAL_CALLDATA" "$DESCRIPTION_BASE (approval for token $TOKEN_ID on $CHAIN)"
  APPROVAL_TX_HASH="$LAST_TX_HASH"
  APPROVAL_BLOCK="$LAST_BLOCK_NUMBER"
  printf '  Approval tx: %s\n' "$APPROVAL_TX_HASH"
fi

submit_bankr_contract_call "$AUCTION_CONTRACT" "$CONFIGURE_CALLDATA" "$DESCRIPTION_BASE (token $TOKEN_ID on $CHAIN)"
STAMP_UTC="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
RECEIPT_PATH="$PROJECT_RECEIPTS_DIR/${STAMP_UTC//:/-}-rare-synethsis-auction-create.json"
RECEIPT_PAYLOAD="$(jq -n \
  --arg schema 'aaigotchi.rare-synethsis.auction-create.receipt.v1' \
  --arg timestamp "$STAMP_UTC" \
  --arg chain "$CHAIN" \
  --argjson chainId "$CHAIN_ID" \
  --arg auctionContract "$AUCTION_CONTRACT" \
  --arg collectionContract "$COLLECTION_CONTRACT" \
  --arg contractMode "$RESOLVED_CONTRACT_MODE" \
  --arg collectionSource "$RESOLVED_COLLECTION_SOURCE" \
  --arg deployReceiptFile "$RESOLVED_DEPLOY_RECEIPT_FILE" \
  --arg tokenId "$TOKEN_ID" \
  --arg seller "$SELLER_ADDRESS" \
  --arg ownerOnchain "$CURRENT_OWNER" \
  --arg startingPriceEth "$STARTING_PRICE_ETH" \
  --arg startingPriceWei "$STARTING_PRICE_WEI" \
  --arg durationSeconds "$DURATION_SECONDS" \
  --arg requestedStartTime "$START_TIME" \
  --arg startTime "$EFFECTIVE_START_TIME" \
  --arg currency "$CURRENCY_ADDRESS" \
  --arg auctionType "$AUCTION_TYPE" \
  --arg approvalStatus "$APPROVAL_STATUS" \
  --arg approvalNeeded "$NEEDS_APPROVAL" \
  --arg approvalTxHash "$APPROVAL_TX_HASH" \
  --arg approvalBlock "$APPROVAL_BLOCK" \
  --arg txHash "$LAST_TX_HASH" \
  --arg explorerUrl "${EXPLORER_TX_BASE}${LAST_TX_HASH}" \
  --arg blockNumber "$LAST_BLOCK_NUMBER" \
  --arg txStatus "$LAST_TX_STATUS" \
  --arg rpcUrl "$RPC_URL" \
  '{
    schema: $schema,
    timestamp: $timestamp,
    chain: $chain,
    chainId: $chainId,
    auctionContract: $auctionContract,
    collectionContract: $collectionContract,
    contractMode: $contractMode,
    collectionSource: $collectionSource,
    deployReceiptFile: $deployReceiptFile,
    tokenId: $tokenId,
    seller: $seller,
    ownerOnchain: $ownerOnchain,
    startingPriceEth: $startingPriceEth,
    startingPriceWei: $startingPriceWei,
    durationSeconds: $durationSeconds,
    requestedStartTime: $requestedStartTime,
    startTime: $startTime,
    currency: $currency,
    auctionType: $auctionType,
    approvalStatus: $approvalStatus,
    approvalNeeded: $approvalNeeded,
    approvalTxHash: $approvalTxHash,
    approvalBlock: $approvalBlock,
    txHash: $txHash,
    explorerUrl: $explorerUrl,
    blockNumber: $blockNumber,
    txStatus: $txStatus,
    rpcUrl: $rpcUrl
  }')"
write_project_receipt_json "$RECEIPT_PATH" "$RECEIPT_PAYLOAD"

echo
echo 'SuperRare auction created via Bankr'
echo "  Tx hash: $LAST_TX_HASH"
echo "  Explorer: ${EXPLORER_TX_BASE}${LAST_TX_HASH}"
echo "  Block: $LAST_BLOCK_NUMBER"
echo "  Receipt: $RECEIPT_PATH"
