#!/usr/bin/env bash
# Iter 72 — Deploy governance slice (feed recovery, sitemap, expire fix) without feature modules.
set -euo pipefail

PROJECT_DIR="${1:-/var/www/lg}"
LOG="/var/log/lg/governance-deploy.log"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "$LOG"; }

log "=== Governance deploy start ==="

cd "$PROJECT_DIR/apps/api"
rm -rf dist tsconfig.tsbuildinfo
pnpm exec tsc --outDir dist --declaration --sourceMap 2>&1 | tee -a "$LOG" | tail -20

if [[ ! -f dist/main.js ]]; then
  log "ERROR: dist/main.js missing after tsc"
  exit 1
fi

cd "$PROJECT_DIR"
pm2 reload deploy/ecosystem.config.js --update-env
sleep 8

HEALTH=$(curl -sf "http://127.0.0.1:3000/api/v1/health" || echo FAIL)
log "Health: $HEALTH"

COUNTS=$(curl -sf "http://127.0.0.1:3000/api/v1/blocks/catalog-counts?region_id=1" || echo FAIL)
log "Catalog: $COUNTS"

log "=== Governance deploy complete ==="
