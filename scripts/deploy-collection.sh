#!/usr/bin/env bash
set -euo pipefail
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="$PROJECT_DIR/collection.config.json"
NAME="$(jq -r .collectionName "$CONFIG_FILE")"
SYMBOL="$(jq -r .symbol "$CONFIG_FILE")"
MAX_SUPPLY="$(jq -r .maxSupply "$CONFIG_FILE")"
CHAIN="$(jq -r .chain "$CONFIG_FILE")"
ARGS=(--name "$NAME" --symbol "$SYMBOL" --max-tokens "$MAX_SUPPLY" --chain "$CHAIN")
if [[ "${1:-}" == "--broadcast" ]]; then
  shift
  ARGS+=(--broadcast)
fi
exec /home/ubuntu/superrare-deploy/scripts/deploy-via-bankr.sh "${ARGS[@]}" "$@"
