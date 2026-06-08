#!/usr/bin/env bash
# External health watchdog: restart lg-api when /health stops responding.
# Cron must set HOME/PM2_HOME (see install-api-watchdog-cron.sh).
set -euo pipefail

export HOME="${HOME:-/root}"
export PM2_HOME="${PM2_HOME:-/root/.pm2}"
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${PATH:-}"

DEPLOY_ROOT="${LG_DEPLOY_ROOT:-/var/www/lg}"
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

pm2_cmd() {
  pm2 "$@"
}

force_kill_port() {
  local port="${1:-3000}"
  local pids
  pids=$(ss -tlnp 2>/dev/null | grep ":${port} " | sed -n 's/.*pid=\([0-9]*\).*/\1/p' | sort -u || true)
  for pid in $pids; do
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      log "kill -9 pid=$pid (port $port)"
      kill -9 "$pid" 2>/dev/null || true
    fi
  done
}

restart_lg_api() {
  log "restarting lg-api (pm2)"
  if pm2_cmd describe lg-api >/dev/null 2>&1; then
    pm2_cmd restart lg-api --update-env >>"$LOG_FILE" 2>&1 && return 0
  fi
  log "lg-api missing in pm2 — force kill :3000 and start ecosystem"
  force_kill_port 3000
  sleep 1
  pm2_cmd delete lg-api >>"$LOG_FILE" 2>&1 || true
  pm2_cmd start "$DEPLOY_ROOT/deploy/ecosystem.config.js" --only lg-api --update-env >>"$LOG_FILE" 2>&1
}

ensure_feed_worker() {
  if pm2_cmd describe lg-feed-worker >/dev/null 2>&1; then
    local st
    st=$(pm2_cmd jlist 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(next((x['pm2_env']['status'] for x in d if x.get('name')=='lg-feed-worker'),'missing'))" 2>/dev/null || echo unknown)
    if [ "$st" = "stopped" ] || [ "$st" = "errored" ]; then
      log "restarting lg-feed-worker (status=$st)"
      pm2_cmd restart lg-feed-worker --update-env >>"$LOG_FILE" 2>&1 || true
    fi
  else
    log "starting lg-feed-worker"
    pm2_cmd start "$DEPLOY_ROOT/deploy/ecosystem.config.js" --only lg-feed-worker --update-env >>"$LOG_FILE" 2>&1 || true
  fi
}

if health_ok; then
  echo 0 >"$FAIL_COUNTER" 2>/dev/null || true
  ensure_feed_worker
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
  force_kill_port 3000
  restart_lg_api || log "pm2 restart failed"
  ensure_feed_worker
  echo 0 >"$FAIL_COUNTER" 2>/dev/null || true
fi
