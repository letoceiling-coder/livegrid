#!/usr/bin/env bash
# Runtime checks for persistent uploads (Iter 89). Run on server after deploy.
set -euo pipefail

ROOT="${PROJECT_DIR:-/var/www/lg}"
UPLOADS_ROOT="${MEDIA_ROOT:-/srv/livegrid/uploads}"
DEPLOY_UPLOADS="${DEPLOY_ROOT:-$ROOT}/uploads"

echo "=== verify-media-storage ==="
echo "UPLOADS_ROOT=$UPLOADS_ROOT"
echo "DEPLOY_UPLOADS=$DEPLOY_UPLOADS"

if [ ! -d "$UPLOADS_ROOT" ]; then
  echo "ERROR: MEDIA_ROOT directory missing: $UPLOADS_ROOT"
  exit 1
fi

if [ ! -L "$DEPLOY_UPLOADS" ]; then
  echo "ERROR: $DEPLOY_UPLOADS is not a symlink to persistent storage"
  exit 1
fi

link_target="$(readlink -f "$DEPLOY_UPLOADS")"
root_target="$(readlink -f "$UPLOADS_ROOT")"
if [ "$link_target" != "$root_target" ]; then
  echo "ERROR: symlink target mismatch: $link_target != $root_target"
  exit 1
fi
echo "  symlink OK: uploads → $link_target"

for sub in media avatars temp exports; do
  if [ ! -d "$UPLOADS_ROOT/$sub" ]; then
    echo "ERROR: missing subdirectory $UPLOADS_ROOT/$sub"
    exit 1
  fi
done

PROBE="$UPLOADS_ROOT/media/.deploy-probe-$$.txt"
echo "probe" > "$PROBE"
trap 'rm -f "$PROBE"' EXIT

code="$(curl -sf -o /dev/null -w "%{http_code}" "https://livegrid.ru/uploads/media/$(basename "$PROBE")" || echo "000")"
if [ "$code" != "200" ]; then
  echo "ERROR: nginx did not serve probe file (HTTP $code)"
  exit 1
fi
echo "  nginx static /uploads/ OK (HTTP 200)"

pm2_env="$(pm2 env lg-api 2>/dev/null | grep -E '^MEDIA_ROOT:' | head -1 || true)"
echo "  pm2 MEDIA_ROOT: ${pm2_env:-not found (check ecosystem.config.js)}"

echo "=== verify-media-storage: OK ==="
