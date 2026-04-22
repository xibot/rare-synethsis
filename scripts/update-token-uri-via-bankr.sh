#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=auction-bankr-lib.sh
source "$SCRIPT_DIR/auction-bankr-lib.sh"

require_bin cast
require_bin jq
require_bin curl

TOKEN_ID=""
TOKEN_URI=""
CHAIN_OVERRIDE=""
CONTRACT_MODE_OVERRIDE="ownership-given"
COLLECTION_OVERRIDE=""
DEPLOY_RECEIPT_OVERRIDE=""
NOTE_OVERRIDE=""
DRY_RUN_MODE="${DRY_RUN:-1}"
BANKR_SUBMIT_TIMEOUT_SECONDS="${BANKR_SUBMIT_TIMEOUT_SECONDS:-60}"
RECEIPT_WAIT_TIMEOUT_SECONDS="${RECEIPT_WAIT_TIMEOUT_SECONDS:-300}"
RECEIPT_POLL_INTERVAL_SECONDS="${RECEIPT_POLL_INTERVAL_SECONDS:-5}"

usage() {
  cat <<USAGE
Usage:
  ./scripts/update-token-uri-via-bankr.sh --token-id <id> --token-uri <uri> [--contract-mode ownership-given|own-deployed] [--contract <address>] [--deploy-receipt <path>] [--chain mainnet|sepolia|base|base-sepolia] [--broadcast] [--note <text>]
USAGE
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --token-id|--index)
      TOKEN_ID="${2:-}"
      shift 2
      ;;
    --token-uri)
      TOKEN_URI="${2:-}"
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
[ -n "$TOKEN_URI" ] || err "--token-uri is required"
[[ "$TOKEN_ID" =~ ^[0-9]+$ ]] || err "--token-id must be a whole number"

load_config
apply_auction_chain_defaults "$CHAIN_OVERRIDE"
resolve_collection_contract "$CONTRACT_MODE_OVERRIDE" "$COLLECTION_OVERRIDE" "$DEPLOY_RECEIPT_OVERRIDE"
COLLECTION_CONTRACT="$RESOLVED_COLLECTION_CONTRACT"
CURRENT_OWNER="$(read_token_owner_onchain "$COLLECTION_CONTRACT" "$TOKEN_ID")"
CALLDATA="$(cast calldata 'updateTokenURI(uint256,string)' "$TOKEN_ID" "$TOKEN_URI")"
DESCRIPTION_BASE="${NOTE_OVERRIDE:-Rare SynETHsis token URI update via aaigotchi}"

printf 'SuperRare token URI update preview\n'
printf '  Chain: %s (%s)\n' "$CHAIN" "$CHAIN_ID"
printf '  Collection: %s\n' "$COLLECTION_CONTRACT"
printf '  Token ID: %s\n' "$TOKEN_ID"
printf '  Current owner: %s\n' "${CURRENT_OWNER:-unknown}"
printf '  Token URI bytes: %s\n' "${#TOKEN_URI}"
printf '  Calldata: %s...\n' "${CALLDATA:0:74}"
printf '  Dry run: %s\n' "$DRY_RUN_MODE"

if [ "$DRY_RUN_MODE" != "0" ]; then
  exit 0
fi

submit_bankr_contract_call "$COLLECTION_CONTRACT" "$CALLDATA" "$DESCRIPTION_BASE (token $TOKEN_ID on $CHAIN)"
STAMP_UTC="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
RECEIPT_PATH="$PROJECT_RECEIPTS_DIR/${STAMP_UTC//:/-}-rare-synethsis-token-uri-update.json"
RECEIPT_PAYLOAD="$(jq -n \
  --arg schema 'aaigotchi.rare-synethsis.token-uri-update.receipt.v1' \
  --arg timestamp "$STAMP_UTC" \
  --arg chain "$CHAIN" \
  --argjson chainId "$CHAIN_ID" \
  --arg collectionContract "$COLLECTION_CONTRACT" \
  --arg tokenId "$TOKEN_ID" \
  --arg tokenUri "$TOKEN_URI" \
  --arg txHash "$LAST_TX_HASH" \
  --arg explorerUrl "${EXPLORER_TX_BASE}${LAST_TX_HASH}" \
  --arg blockNumber "$LAST_BLOCK_NUMBER" \
  --arg txStatus "$LAST_TX_STATUS" \
  '{
    schema: $schema,
    timestamp: $timestamp,
    chain: $chain,
    chainId: $chainId,
    collectionContract: $collectionContract,
    tokenId: $tokenId,
    tokenUri: $tokenUri,
    txHash: $txHash,
    explorerUrl: $explorerUrl,
    blockNumber: $blockNumber,
    txStatus: $txStatus
  }')"
write_project_receipt_json "$RECEIPT_PATH" "$RECEIPT_PAYLOAD"

echo
echo 'SuperRare token URI updated via Bankr'
echo "  Tx hash: $LAST_TX_HASH"
echo "  Explorer: ${EXPLORER_TX_BASE}${LAST_TX_HASH}"
echo "  Block: $LAST_BLOCK_NUMBER"
echo "  Receipt: $RECEIPT_PATH"
