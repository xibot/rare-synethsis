#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=auction-bankr-lib.sh
source "$SCRIPT_DIR/auction-bankr-lib.sh"

require_bin cast
require_bin jq

TOKEN_ID=""
CHAIN_OVERRIDE=""
CONTRACT_MODE_OVERRIDE="own-deployed"
COLLECTION_OVERRIDE=""
DEPLOY_RECEIPT_OVERRIDE=""

usage() {
  cat <<USAGE
Usage:
  ./scripts/auction-status.sh --token-id <id> [--contract-mode ownership-given|own-deployed] [--contract <address>] [--deploy-receipt <path>] [--chain mainnet|sepolia|base|base-sepolia]
USAGE
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --token-id|--index)
      TOKEN_ID="${2:-}"
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
    --chain)
      CHAIN_OVERRIDE="${2:-}"
      shift 2
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
[[ "$TOKEN_ID" =~ ^[0-9]+$ ]] || err "--token-id must be a whole number"

load_config
apply_auction_chain_defaults "$CHAIN_OVERRIDE"
resolve_collection_contract "$CONTRACT_MODE_OVERRIDE" "$COLLECTION_OVERRIDE" "$DEPLOY_RECEIPT_OVERRIDE"
COLLECTION_CONTRACT="$RESOLVED_COLLECTION_CONTRACT"

mapfile -t DETAILS < <(cast call "$AUCTION_CONTRACT" 'getAuctionDetails(address,uint256)(address,uint256,uint256,uint256,address,uint256,bytes32,address[],uint8[])' "$COLLECTION_CONTRACT" "$TOKEN_ID" --rpc-url "$RPC_URL")
SELLER="${DETAILS[0]:-$ZERO_ADDRESS}"
CREATION_BLOCK="${DETAILS[1]:-0}"
STARTING_TIME="${DETAILS[2]:-0}"
LENGTH_OF_AUCTION="${DETAILS[3]:-0}"
CURRENCY="${DETAILS[4]:-$ZERO_ADDRESS}"
MINIMUM_BID="${DETAILS[5]:-0}"
AUCTION_TYPE="${DETAILS[6]:-0x0000000000000000000000000000000000000000000000000000000000000000}"
SPLIT_ADDRESSES="${DETAILS[7]:-[]}"
SPLIT_RATIOS="${DETAILS[8]:-[]}"
STARTED=false
STATUS="PENDING"
END_TIME="0"
NOW_TS="$(date +%s)"
if [ "$STARTING_TIME" != "0" ]; then
  STARTED=true
  END_TIME="$(( STARTING_TIME + LENGTH_OF_AUCTION ))"
  if [ "$NOW_TS" -ge "$END_TIME" ]; then
    STATUS="ENDED"
  else
    STATUS="RUNNING"
  fi
fi
AUCTION_TYPE_LABEL="$(printf '%s' "$AUCTION_TYPE" | sed 's/^0x//' | xxd -r -p 2>/dev/null | tr -d '\000' || true)"
IS_ETH=false
if [ "$CURRENCY" = "$ETH_ADDRESS" ]; then
  IS_ETH=true
fi

jq -n \
  --arg chain "$CHAIN" \
  --arg auctionContract "$AUCTION_CONTRACT" \
  --arg collectionContract "$COLLECTION_CONTRACT" \
  --arg tokenId "$TOKEN_ID" \
  --arg seller "$SELLER" \
  --arg creationBlock "$CREATION_BLOCK" \
  --arg startingTime "$STARTING_TIME" \
  --arg lengthOfAuction "$LENGTH_OF_AUCTION" \
  --arg currency "$CURRENCY" \
  --arg minimumBid "$MINIMUM_BID" \
  --arg auctionType "$AUCTION_TYPE" \
  --arg auctionTypeLabel "$AUCTION_TYPE_LABEL" \
  --arg splitAddresses "$SPLIT_ADDRESSES" \
  --arg splitRatios "$SPLIT_RATIOS" \
  --arg endTime "$END_TIME" \
  --arg status "$STATUS" \
  --argjson started "$STARTED" \
  --argjson isEth "$IS_ETH" \
  '{
    chain: $chain,
    auctionContract: $auctionContract,
    collectionContract: $collectionContract,
    tokenId: $tokenId,
    seller: $seller,
    creationBlock: $creationBlock,
    startingTime: $startingTime,
    lengthOfAuction: $lengthOfAuction,
    currency: $currency,
    minimumBid: $minimumBid,
    auctionType: $auctionType,
    auctionTypeLabel: $auctionTypeLabel,
    splitAddresses: $splitAddresses,
    splitRatios: $splitRatios,
    started: $started,
    isEth: $isEth,
    endTime: $endTime,
    status: $status
  }'
