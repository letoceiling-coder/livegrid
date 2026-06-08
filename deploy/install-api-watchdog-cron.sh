#!/usr/bin/env bash
# Registers lg-api-watchdog.sh in root crontab (idempotent).
set -euo pipefail

_script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WATCHDOG="$_script_dir/lg-api-watchdog.sh"
CRON_LINE="*/2 * * * * HOME=/root PM2_HOME=/root/.pm2 LG_DEPLOY_ROOT=/var/www/lg bash $WATCHDOG >/dev/null 2>&1"

chmod +x "$WATCHDOG"

mkdir -p /var/log/lg
touch /var/log/lg/api-watchdog.log

existing="$(crontab -l 2>/dev/null || true)"
filtered="$(echo "$existing" | grep -Fv 'lg-api-watchdog.sh' | grep -Fv 'LiveGrid API health watchdog' || true)"

{
  echo "$filtered"
  echo "# LiveGrid API health watchdog (auto-restart on hung process)"
  echo "$CRON_LINE"
} | crontab -

echo "Installed API watchdog cron: $CRON_LINE"
