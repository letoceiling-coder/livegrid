#!/usr/bin/env bash
# Migration drift detection — Iter 61 (non-destructive).
set -eu
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT/packages/database"

if [ -f "$ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi

echo "== prisma migrate status =="
if ! npx prisma migrate status 2>&1; then
  echo "FAIL: migrate status error (DB offline or auth issue)"
  exit 1
fi

echo ""
echo "Tip: apply pending with: cd packages/database && npx prisma migrate deploy"
