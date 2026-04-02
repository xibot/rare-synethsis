#!/usr/bin/env bash
set -euo pipefail
cd /home/ubuntu/rare-synethsis
mkdir -p /home/ubuntu/.openclaw/logs
exec flock -n /tmp/rare-synethsis-agentic.lock bash -lc 'cd /home/ubuntu/rare-synethsis && /usr/bin/node scripts/agentic-check.mjs --broadcast && bash scripts/sync-receipts.sh'
