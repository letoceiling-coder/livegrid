#!/usr/bin/env bash
# External health watchdog: restart lg-api when /health stops responding.
# Install cron via deploy/install-api-watchdog-cron.sh (every 2 minutes).
set -euo pipefail

LOG_FILE="${LG_API_WATCHDOG_LOG:-/var/log/lg/api-watchdog.log}"
API_URL="${API_HEALTH_URL:-http://127.0.0.1:3000/api/v1/health}"
TIMEOUT_SEC="${API_HEALTH_TIMEOUT_SEC:-8}"
FAIL_COUNTER="${LG_API_HEALTH_FAIL_FILE:-/var/run/lg-api-health-fail.count}"
FAIL_THRESHOLD="${LG_API_HEALTH_FAIL_THRESHOLD:-2}"

mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true

log() {
  echo "$(date -Is) $*" >>"$LOG_FILE"
}

health_ok() {
  curl -sf --max-time "$TIMEOUT_SEC" "$API_URL" >/dev/null 2>&1
}

if health_ok; then
  echo 0 >"$FAIL_COUNTER" 2>/dev/null || true
  exit 0
fi

count=0
if [ -f "$FAIL_COUNTER" ]; then
  count=$(cat "$FAIL_COUNTER" 2>/dev/null || echo 0)
fi
count=$((count + 1))
echo "$count" >"$FAIL_COUNTER"

log "health check failed ($count/$FAIL_THRESHOLD) url=$API_URL"

if [ "$count" -ge "$FAIL_THRESHOLD" ]; then
  log "restarting lg-api (pm2)"
  if command -v pm2 >/dev/null 2>&1; then
    pm2 restart lg-api --update-env >>"$LOG_FILE" 2>&1 || log "pm2 restart failed"
  else
    log "pm2 not found — skip restart"
  fi
  echo 0 >"$FAIL_COUNTER" 2>/dev/null || true
fi
