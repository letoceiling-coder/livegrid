#!/usr/bin/env bash
# Iter 73 — Deploy admin SPA + system diagnostics governance API slice.
set -euo pipefail

PROJECT_DIR="${1:-/var/www/lg}"
LOG="/var/log/lg/web-governance-deploy.log"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "$LOG"; }

log "=== Web governance deploy start ==="

cd "$PROJECT_DIR/apps/api"
rm -rf dist tsconfig.tsbuildinfo
pnpm exec tsc --outDir dist --declaration --sourceMap 2>&1 | tee -a "$LOG" | tail -15
test -f dist/main.js

cd "$PROJECT_DIR"
pm2 reload deploy/ecosystem.config.js --update-env
sleep 8

log "Health: $(curl -sf http://127.0.0.1:3000/api/v1/health || echo FAIL)"
log "System diagnostics: $(curl -sfI http://127.0.0.1:3000/api/v1/admin/system/diagnostics 2>&1 | head -1 || true)"

log "=== Web governance deploy complete ==="
