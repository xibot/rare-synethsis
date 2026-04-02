#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

current_branch="$(git rev-parse --abbrev-ref HEAD)"

push_remote() {
  local remote="$1"
  local account="${2:-}"
  if [ -n "$account" ]; then
    gh auth switch -u "$account" >/dev/null 2>&1 || true
  fi
  git push "$remote" "$current_branch"
}

build_commit_message() {
  local ids_raw
  local ids=()

  ids_raw="$({ printf '%s\n' "$@" | sed -nE 's#^receipts/.*-([0-9]{3})-[^-]+\.json$#\1#p' || true; } | sed 's/^0*//' | sed 's/^$/0/' | sort -n -u)"

  while IFS= read -r line; do
    [ -n "$line" ] || continue
    ids+=("$line")
  done <<< "$ids_raw"

  if [ "${#ids[@]}" -eq 1 ]; then
    printf 'Add token %s automation receipts\n' "${ids[0]}"
    return 0
  fi

  if [ "${#ids[@]}" -gt 1 ]; then
    printf 'Add token %s automation receipts\n' "$(IFS=,; echo "${ids[*]}")"
    return 0
  fi

  printf 'Sync latest automation receipts\n'
}

mapfile -t receipt_changes < <(git ls-files --others --modified --exclude-standard -- receipts)

if [ "${#receipt_changes[@]}" -gt 0 ]; then
  git add -- "${receipt_changes[@]}"
  commit_message="$(build_commit_message "${receipt_changes[@]}")"
  git commit -m "$commit_message"
fi

push_remote origin aaigotchi
push_remote xibot xibot
push_remote gitlab aaigotchi
