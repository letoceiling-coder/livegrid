#!/usr/bin/env bash
# Run ON PRODUCTION SERVER ONLY (read-only pg_dump).
# Usage:
#   ALLOW_PROD_DB_EXPORT=yes bash scripts/prod-db-export.sh /tmp/lg_production_$(date +%Y%m%d).dump
#
# Transfer to dev machine (from Windows PowerShell):
#   scp -i $env:USERPROFILE\.ssh\id_ed25519_beget root@85.198.64.93:/tmp/lg_production_*.dump $env:USERPROFILE\livegrid-snapshots\

set -euo pipefail

OUT="${1:-/tmp/lg_production.dump}"

if [[ "${ALLOW_PROD_DB_EXPORT:-}" != "yes" ]]; then
  echo "Set ALLOW_PROD_DB_EXPORT=yes to confirm intentional read-only full export."
  exit 1
fi

if [[ -f /var/www/lg/deploy/load-api-env.sh ]]; then
  # shellcheck source=/dev/null
  source /var/www/lg/deploy/load-api-env.sh
fi

echo "[prod-db-export] READ-ONLY pg_dump → ${OUT}"

if [[ -n "${DATABASE_URL:-}" ]]; then
  pg_dump \
    --dbname="$DATABASE_URL" \
    --format=custom \
    --no-owner \
    --no-privileges \
    --verbose \
    --file="$OUT"
else
  DB="${PGDATABASE:-lg_production}"
  pg_dump \
    --dbname="$DB" \
    --format=custom \
    --no-owner \
    --no-privileges \
    --verbose \
    --file="$OUT"
fi

ls -lh "$OUT"
echo "[prod-db-export] Done. Never commit dump files to git."
