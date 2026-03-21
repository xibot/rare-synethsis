#!/usr/bin/env bash
set -euo pipefail
cd /home/ubuntu/rare-synethsis
mkdir -p /home/ubuntu/.openclaw/logs
exec flock -n /tmp/rare-synethsis-agentic.lock /usr/bin/node scripts/agentic-check.mjs --broadcast
