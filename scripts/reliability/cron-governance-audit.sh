#!/usr/bin/env bash
# Audit feed import schedulers — run ON PRODUCTION SERVER.
# Ensures single canonical weekly Monday cron (BullMQ) + no legacy 6h/12h jobs.
set -euo pipefail

ROOT="${DEPLOY_ROOT:-/var/www/lg}"
LOG="${CRON_AUDIT_LOG:-/var/log/lg/cron-governance-audit.log}"

{
  echo "=== Cron governance audit $(date -Iseconds) ==="

  echo ""
  echo "→ crontab (current user)"
  crontab -l 2>/dev/null || echo "(no crontab)"

  echo ""
  echo "→ /etc/cron.d (grep feed|import|lg|livegrid)"
  grep -rniE 'feed|import|livegrid|/var/www/lg' /etc/cron.d 2>/dev/null || echo "(none)"

  echo ""
  echo "→ PM2 lg-api FEED_* env"
  if command -v pm2 >/dev/null; then
    pm2 env lg-api 2>/dev/null | grep -E '^FEED_' || pm2 describe lg-api 2>/dev/null | grep -i feed || true
  else
    echo "pm2 not found"
  fi

  echo ""
  echo "→ $ROOT/.env FEED_IMPORT_*"
  if [[ -f "$ROOT/.env" ]]; then
    grep -E '^FEED_IMPORT|^FEED_HTTP|^FEED_MARK|^FEED_HEALTH|^FEED_RECOVERY' "$ROOT/.env" || true
  else
    echo ".env missing at $ROOT"
  fi

  echo ""
  echo "→ deploy/cron-feed-import.sh (emergency fallback only)"
  if [[ -f "$ROOT/deploy/cron-feed-import.sh" ]]; then
    head -5 "$ROOT/deploy/cron-feed-import.sh"
  fi

  echo ""
  echo "→ BullMQ repeatable jobs (Redis)"
  if command -v redis-cli >/dev/null; then
    redis-cli --scan --pattern '*feed-import*repeat*' 2>/dev/null | head -20 || true
    redis-cli KEYS '*repeat*feed*' 2>/dev/null | head -10 || true
  fi

  echo ""
  echo "=== Policy checklist ==="
  echo "[ ] FEED_IMPORT_CRON=0 4 * * 1"
  echo "[ ] FEED_IMPORT_CRON_TZ=Europe/Moscow"
  echo "[ ] FEED_IMPORT_DISABLE_REPEAT=false (after recovery validated)"
  echo "[ ] No */6 or */12 feed import in crontab"
  echo "[ ] FEED_HTTP_FETCH_ALLOWED=true on server only"
  echo "[ ] Manual admin trigger remains available"

} | tee -a "$LOG"
