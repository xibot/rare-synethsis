#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
export SUPER_RARE_CONFIG_FILE="${SUPER_RARE_CONFIG_FILE:-$PROJECT_DIR/superrare.config.json}"
# shellcheck source=/home/ubuntu/superrare-mint/scripts/lib.sh
source /home/ubuntu/superrare-mint/scripts/lib.sh

ETH_ADDRESS="0x0000000000000000000000000000000000000000"
PROJECT_RECEIPTS_DIR="$PROJECT_DIR/receipts"
AUCTION_CONTRACT=""
EXPLORER_ADDRESS_BASE=""
LAST_TX_HASH=""
LAST_RECEIPT_JSON=""
LAST_BLOCK_NUMBER=""
LAST_TX_STATUS=""

apply_auction_chain_defaults() {
  apply_chain_defaults "${1:-}"
  case "$CHAIN" in
    mainnet)
      AUCTION_CONTRACT="0x6D7c44773C52D396F43c2D511B81aa168E9a7a42"
      EXPLORER_ADDRESS_BASE="https://etherscan.io/address/"
      ;;
    sepolia)
      AUCTION_CONTRACT="0xC8Edc7049b233641ad3723D6C60019D1c8771612"
      EXPLORER_ADDRESS_BASE="https://sepolia.etherscan.io/address/"
      ;;
    base)
      AUCTION_CONTRACT="0x51c36ffb05e17ed80ee5c02fa83d7677c5613de2"
      EXPLORER_ADDRESS_BASE="https://basescan.org/address/"
      ;;
    base-sepolia)
      AUCTION_CONTRACT="0x1f0c946f0ee87acb268d50ede6c9b4d010af65d2"
      EXPLORER_ADDRESS_BASE="https://sepolia.basescan.org/address/"
      ;;
    *)
      err "Unsupported chain for auction flow: $CHAIN"
      ;;
  esac
}

read_token_owner_onchain() {
  local contract_address="$1"
  local token_id="$2"
  cast call "$contract_address" 'ownerOf(uint256)(address)' "$token_id" --rpc-url "$RPC_URL" 2>/dev/null || true
}

infer_seller_address() {
  local explicit_seller="${1:-}"
  local contract_address="${2:-}"
  local token_id="${3:-}"

  if [ -n "$explicit_seller" ] && [ "$explicit_seller" != "$ZERO_ADDRESS" ]; then
    echo "$explicit_seller"
    return 0
  fi

  if [ -n "$RESOLVED_DEPLOY_RECEIPT_FILE" ] && [ -f "$RESOLVED_DEPLOY_RECEIPT_FILE" ]; then
    local receipt_owner
    receipt_owner="$(jq -r '.ownerAddress // empty' "$RESOLVED_DEPLOY_RECEIPT_FILE")"
    if [ -n "$receipt_owner" ] && [ "$receipt_owner" != "$ZERO_ADDRESS" ]; then
      echo "$receipt_owner"
      return 0
    fi
  fi

  if [ -n "$contract_address" ] && [ -n "$token_id" ]; then
    local onchain_owner
    onchain_owner="$(read_token_owner_onchain "$contract_address" "$token_id")"
    if [ -n "$onchain_owner" ] && [ "$onchain_owner" != "$ZERO_ADDRESS" ]; then
      echo "$onchain_owner"
      return 0
    fi
  fi

  echo ""
}

approval_status_for_owner() {
  local owner_address="$1"
  local contract_address="$2"
  if [ -z "$owner_address" ] || [ "$owner_address" = "$ZERO_ADDRESS" ]; then
    echo "unknown"
    return 0
  fi
  cast call "$contract_address" 'isApprovedForAll(address,address)(bool)' "$owner_address" "$AUCTION_CONTRACT" --rpc-url "$RPC_URL" 2>/dev/null || echo "unknown"
}

read_auction_type() {
  cast call "$AUCTION_CONTRACT" 'COLDIE_AUCTION()(bytes32)' --rpc-url "$RPC_URL"
}

submit_bankr_contract_call() {
  local to="$1"
  local data="$2"
  local description="$3"

  local bankr_api_key bankr_api_url request_payload response success tx_hash receipt_json block_number tx_status
  bankr_api_key="$(resolve_bankr_api_key)"
  bankr_api_url="$(resolve_bankr_api_url)"
  request_payload="$(jq -n \
    --arg to "$to" \
    --argjson chainId "$CHAIN_ID" \
    --arg data "$data" \
    --arg description "$description" \
    '{
      transaction: {
        to: $to,
        chainId: $chainId,
        value: "0",
        data: $data
      },
      description: $description,
      waitForConfirmation: true
    }')"

  response="$(curl -sS --max-time "${BANKR_SUBMIT_TIMEOUT_SECONDS:-60}" -X POST "$bankr_api_url/agent/submit" \
    -H "X-API-Key: $bankr_api_key" \
    -H "Content-Type: application/json" \
    -d "$request_payload")"

  [ -n "$response" ] || err "Bankr submit returned empty response"
  if ! echo "$response" | jq -e . >/dev/null 2>&1; then
    printf 'Bankr submit returned non-JSON response:\n%s\n' "$response" >&2
    err "Bankr submit returned non-JSON response"
  fi

  success="$(echo "$response" | jq -r '.success // false')"
  if [ "$success" != "true" ]; then
    echo "$response" | jq .
    err "Bankr submit failed"
  fi

  tx_hash="$(echo "$response" | jq -r '.transactionHash // empty')"
  [ -n "$tx_hash" ] || err "Bankr response did not include transactionHash"

  receipt_json="$(wait_for_receipt_json "$tx_hash" "$RPC_URL" "${RECEIPT_WAIT_TIMEOUT_SECONDS:-300}" "${RECEIPT_POLL_INTERVAL_SECONDS:-5}")"
  block_number="$(echo "$receipt_json" | jq -r '.blockNumber')"
  tx_status="$(echo "$receipt_json" | jq -r '.status')"
  [ "$tx_status" = "0x1" ] || [ "$tx_status" = "1" ] || err "Transaction reverted: $tx_hash"

  LAST_TX_HASH="$tx_hash"
  LAST_RECEIPT_JSON="$receipt_json"
  LAST_BLOCK_NUMBER="$block_number"
  LAST_TX_STATUS="$tx_status"
}

write_project_receipt_json() {
  local file_path="$1"
  local payload="$2"
  mkdir -p "$PROJECT_RECEIPTS_DIR"
  write_receipt_file "$file_path" "$payload"
}
