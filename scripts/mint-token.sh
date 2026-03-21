#!/usr/bin/env bash
set -euo pipefail
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INDEX=""
STATE=""
TRIGGER="Cycle"
BLOCK_NUMBER="0"
PREVIOUS_STATE="None"
PREVIOUS_HASH="genesis"
SEED_KEY=""
BROADCAST=0
DEPLOY_RECEIPT=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --index|--token-id) INDEX="$2"; shift 2 ;;
    --state) STATE="$2"; shift 2 ;;
    --trigger) TRIGGER="$2"; shift 2 ;;
    --block-number) BLOCK_NUMBER="$2"; shift 2 ;;
    --previous-state) PREVIOUS_STATE="$2"; shift 2 ;;
    --previous-hash) PREVIOUS_HASH="$2"; shift 2 ;;
    --seed-key) SEED_KEY="$2"; shift 2 ;;
    --deploy-receipt) DEPLOY_RECEIPT="$2"; shift 2 ;;
    --broadcast) BROADCAST=1; shift ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done
[[ -n "$INDEX" ]] || { echo "--index is required" >&2; exit 1; }
OUT_DIR="$PROJECT_DIR/output/$(printf "%03d" "$INDEX")"
node "$PROJECT_DIR/scripts/generate-token.mjs" \
  --index "$INDEX" \
  ${STATE:+--state "$STATE"} \
  --trigger "$TRIGGER" \
  --block-number "$BLOCK_NUMBER" \
  --previous-state "$PREVIOUS_STATE" \
  --previous-hash "$PREVIOUS_HASH" \
  ${SEED_KEY:+--seed-key "$SEED_KEY"} \
  --out "$OUT_DIR"
TOKEN_URI="$(cat "$OUT_DIR/token-uri.txt")"
ARGS=(--token-uri "$TOKEN_URI" --contract-mode own-deployed --chain mainnet)
if [[ -n "$DEPLOY_RECEIPT" ]]; then
  ARGS+=(--deploy-receipt "$DEPLOY_RECEIPT")
fi
if [[ "$BROADCAST" == "1" ]]; then
  ARGS+=(--broadcast)
fi
exec /home/ubuntu/superrare-mint/scripts/mint-via-bankr.sh "${ARGS[@]}"
