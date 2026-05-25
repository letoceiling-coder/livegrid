#!/usr/bin/env bash
# Persistent uploads outside git repo — safe across deploy/reset.
set -euo pipefail

_script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$_script_dir/config.sh"

UPLOADS_ROOT="${UPLOADS_ROOT:-${MEDIA_ROOT:-/srv/livegrid/uploads}}"
LEGACY_REPO_UPLOADS="${DEPLOY_ROOT}/uploads"
PM2_USER="${PM2_USER:-root}"

echo "→ ensure-uploads-storage: $UPLOADS_ROOT"

for sub in media avatars temp exports; do
  mkdir -p "$UPLOADS_ROOT/$sub"
done

if [ -d "$LEGACY_REPO_UPLOADS/media" ] && [ ! -L "$LEGACY_REPO_UPLOADS" ]; then
  legacy_count="$(find "$LEGACY_REPO_UPLOADS" -type f 2>/dev/null | wc -l | tr -d ' ')"
  if [ "${legacy_count:-0}" -gt 0 ]; then
    echo "  Migrating $legacy_count file(s) from $LEGACY_REPO_UPLOADS → $UPLOADS_ROOT"
    rsync -a "$LEGACY_REPO_UPLOADS/" "$UPLOADS_ROOT/"
  fi
fi

if [ "$LEGACY_REPO_UPLOADS" != "$UPLOADS_ROOT" ]; then
  if [ -e "$LEGACY_REPO_UPLOADS" ] && [ ! -L "$LEGACY_REPO_UPLOADS" ]; then
    rmdir "$LEGACY_REPO_UPLOADS/media" 2>/dev/null || true
    rmdir "$LEGACY_REPO_UPLOADS" 2>/dev/null || rm -rf "$LEGACY_REPO_UPLOADS"
  fi
  ln -sfn "$UPLOADS_ROOT" "$LEGACY_REPO_UPLOADS"
  echo "  Symlink: $LEGACY_REPO_UPLOADS → $UPLOADS_ROOT"
fi

chown -R "$PM2_USER:$PM2_USER" "$UPLOADS_ROOT" 2>/dev/null || true
chmod -R u+rwX "$UPLOADS_ROOT" 2>/dev/null || true

echo "  uploads ready ($(find "$UPLOADS_ROOT/media" -type f 2>/dev/null | wc -l | tr -d ' ') media files)"
