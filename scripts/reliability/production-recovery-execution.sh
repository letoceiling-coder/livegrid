#!/usr/bin/env bash
# Iter 70 — Full production feed parity execution (server-side).
#
# Required env:
#   API_BASE=https://livegrid.ru/api/v1
#   ADMIN_EMAIL / ADMIN_PASSWORD
#   REGION=msk  REGION_ID=1
#
# Optional flags:
#   EXECUTE_SOLD_RESTORE=1   — run real SOLD restore (after dry-run review)
#   TRIGGER_FULL_IMPORT=1  — trigger import + wait for completion
#   GENERATE_SITEMAP=1     — regen chunked sitemaps (default 1)
#   WAIT_IMPORT_MAX_SEC=7200
#
set -euo pipefail

API_BASE="${API_BASE:-https://livegrid.ru/api/v1}"
REGION="${REGION:-msk}"
REGION_ID="${REGION_ID:-1}"
LOG="${LOG_FILE:-/var/log/lg/production-recovery-execution.log}"
BASELINE_DIR="${BASELINE_DIR:-/var/log/lg/feed-recovery-baseline}"
WAIT_IMPORT_MAX_SEC="${WAIT_IMPORT_MAX_SEC:-7200}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

mkdir -p "$(dirname "$LOG")" "$BASELINE_DIR"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "$LOG"; }

die() { log "ERROR: $*"; exit 1; }

[[ -n "${ADMIN_EMAIL:-}" && -n "${ADMIN_PASSWORD:-}" ]] || die "Set ADMIN_EMAIL and ADMIN_PASSWORD"

log "========== ITER 70 PRODUCTION RECOVERY START =========="

export API_BASE REGION REGION_ID ADMIN_EMAIL ADMIN_PASSWORD BASELINE_DIR
log "Phase 1: BEFORE baseline snapshot"
bash "$SCRIPT_DIR/production-baseline-snapshot.sh" before 2>&1 | tee -a "$LOG"

log "Phase 2: cron governance audit"
if [[ -f "$SCRIPT_DIR/cron-governance-audit.sh" ]]; then
  bash "$SCRIPT_DIR/cron-governance-audit.sh" 2>&1 | tee -a "$LOG" || log "WARN: cron audit had issues"
fi

log "Phase 3: authenticate"
TOKEN=$(curl -sf -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")
AUTH="Authorization: Bearer $TOKEN"

api_get() { curl -sf --max-time 180 "$API_BASE/$1" -H "$AUTH"; }
api_post() { curl -sf --max-time 600 -X POST "$API_BASE/$1" -H "$AUTH" -H "Content-Type: application/json" -d "${2:-{}}"; }

log "Phase 4: production state audit + integrity (heavy)"
api_get "admin/feed-import/recovery/audit?region=$REGION" | tee -a "$LOG" | python3 -m json.tool | head -50
api_get "admin/feed-import/integrity?region=$REGION&include_apartments=1" | tee "$BASELINE_DIR/integrity-before.json" | python3 -m json.tool | head -80

log "Phase 5: SOLD recovery dry-run"
PLAN=$(api_post "admin/feed-import/recovery/sold-restore?region=$REGION&dry_run=1")
echo "$PLAN" | tee "$BASELINE_DIR/sold-plan.json" | python3 -m json.tool
FALSE_SOLD=$(echo "$PLAN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('falseSoldCandidates',0))")
FEED_APT=$(echo "$PLAN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('feedApartmentCount',0))")
log "falseSoldCandidates=$FALSE_SOLD feedApartmentCount=$FEED_APT"

if [[ "${EXECUTE_SOLD_RESTORE:-}" == "1" ]]; then
  if [[ "$FALSE_SOLD" -le 0 ]]; then
    log "SKIP sold restore — no false SOLD candidates"
  else
    log "Phase 6: EXECUTE SOLD restore"
    api_post "admin/feed-import/recovery/sold-restore?region=$REGION" | tee "$BASELINE_DIR/sold-restore-result.json" | python3 -m json.tool
  fi
else
  log "Phase 6: SKIP sold restore (EXECUTE_SOLD_RESTORE=1 to execute)"
fi

if [[ "${TRIGGER_FULL_IMPORT:-}" == "1" ]]; then
  log "Phase 7: trigger full feed import"
  api_post "admin/feed-import/trigger?region=$REGION" | tee -a "$LOG"
  log "Waiting for import (max ${WAIT_IMPORT_MAX_SEC}s)..."
  elapsed=0
  while [[ "$elapsed" -lt "$WAIT_IMPORT_MAX_SEC" ]]; do
    sleep 30
    elapsed=$((elapsed + 30))
    PROG=$(curl -sf --max-time 15 "$API_BASE/admin/feed-import/progress" -H "$AUTH" || echo '{}')
    STEP=$(echo "$PROG" | python3 -c "import sys,json; print(json.load(sys.stdin).get('step','?'))" 2>/dev/null || echo "?")
    PCT=$(echo "$PROG" | python3 -c "import sys,json; print(json.load(sys.stdin).get('percent',0))" 2>/dev/null || echo "0")
    log "  progress: step=$STEP percent=$PCT elapsed=${elapsed}s"
    if [[ "$STEP" == "Completed" || "$STEP" == "Failed" ]]; then
      break
    fi
  done
  api_get "admin/feed-import/integrity?region=$REGION&include_apartments=1" | tee "$BASELINE_DIR/integrity-after-import.json" | python3 -m json.tool | head -80
else
  log "Phase 7: SKIP import (TRIGGER_FULL_IMPORT=1 to trigger)"
fi

log "Phase 8: parity validation (public catalog + data quality)"
CC=$(curl -sf --max-time 20 "$API_BASE/blocks/catalog-counts?region_id=$REGION_ID")
echo "$CC" | tee -a "$LOG"
api_get "admin/feed-import/recovery/data-quality?region=$REGION" | tee "$BASELINE_DIR/data-quality.json" | python3 -m json.tool

log "Phase 9: refresh catalog cache"
api_post "admin/feed-import/refresh-cache" >/dev/null 2>&1 || log "WARN: refresh-cache failed"

if [[ "${GENERATE_SITEMAP:-1}" == "1" ]]; then
  log "Phase 10: sitemap regeneration"
  api_post "admin/sitemap/generate" | tee "$BASELINE_DIR/sitemap-generate.json" | python3 -m json.tool || log "WARN: sitemap generate failed (deploy iter 68 API?)"
  curl -sfI --max-time 15 "${API_BASE%/api/v1}/api/v1/sitemap/sitemap-index.xml" | head -5 | tee -a "$LOG" || true
fi

log "Phase 11: AFTER baseline snapshot"
bash "$SCRIPT_DIR/production-baseline-snapshot.sh" after 2>&1 | tee -a "$LOG"

log "Phase 12: performance smoke"
for path in "blocks/catalog-counts?region_id=$REGION_ID&per_page=24" "blocks?page=1&per_page=24&region_id=$REGION_ID"; do
  t=$(curl -sf -o /dev/null -w '%{time_total}' --max-time 30 "$API_BASE/$path")
  log "  GET /$path time=${t}s"
done

log "========== ITER 70 PRODUCTION RECOVERY FINISHED =========="
log "Review: $BASELINE_DIR and $LOG"
