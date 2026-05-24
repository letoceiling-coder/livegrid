#!/usr/bin/env bash
# Feed forensics — расширение audit-feed-db.sh + SOLD/markSold анализ.
# Usage: bash scripts/reliability/feed-forensics.sh [region_code]
set -euo pipefail

CODE="${1:-msk}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

echo "=== Feed forensics · region=$CODE ==="
bash "$ROOT/deploy/audit-feed-db.sh" 2>/dev/null || {
  echo "Note: full audit requires deploy/audit-feed-db.sh env (DATABASE_URL on server)"
}

if [[ -z "${DATABASE_URL:-}" ]]; then
  if [[ -f "$ROOT/.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$ROOT/.env"
    set +a
  fi
fi

if [[ "${DATABASE_URL:-}" == postgresql* ]]; then
  RID=$(psql "$DATABASE_URL" -t -A -c "SELECT id FROM feed_regions WHERE lower(code)=lower('$CODE') LIMIT 1;" | tr -d '[:space:]')
  echo ""
  echo "→ SOLD feed apartments (markSold forensic)"
  psql "$DATABASE_URL" -c "SELECT COUNT(*) AS sold_feed_apartments FROM listings WHERE region_id=$RID AND kind='APARTMENT' AND data_source='FEED' AND status='SOLD';"
  echo ""
  echo "→ import_batches stats (last 3 completed)"
  psql "$DATABASE_URL" -c "SELECT id, finished_at, stats->>'apartments_in_feed' AS in_feed, stats->>'apartments_upserted' AS upserted, stats->>'apartments_marked_sold' AS marked_sold, stats->>'mark_sold_skipped' AS skip_sold FROM import_batches WHERE region_id=$RID AND status='COMPLETED' ORDER BY finished_at DESC LIMIT 3;"
  echo ""
  echo "→ Root cause hints"
  echo "  - sold >> active + low apartments_in_feed on last batch => truncated import + markSold"
  echo "  - apartments_upserted ~ apartments_in_feed but active low => check SOLD count"
  echo "  - no hidden take/limit in importer — batchSize=500 is chunk only"
  echo "  - vitrine excludes block_id IS NULL and price < 100000"
fi
