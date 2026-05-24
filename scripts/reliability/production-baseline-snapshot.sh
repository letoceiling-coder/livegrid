#!/usr/bin/env bash
# Capture production recovery baseline (public + authenticated admin metrics).
# Usage:
#   export API_BASE=https://livegrid.ru/api/v1
#   export ADMIN_EMAIL=... ADMIN_PASSWORD=...
#   export REGION=msk REGION_ID=1
#   ./scripts/reliability/production-baseline-snapshot.sh [before|after]
set -euo pipefail

PHASE="${1:-before}"
API_BASE="${API_BASE:-https://livegrid.ru/api/v1}"
REGION="${REGION:-msk}"
REGION_ID="${REGION_ID:-1}"
OUT_DIR="${BASELINE_DIR:-./artifacts/feed-recovery}/$(date +%Y%m%d-%H%M%S)-${PHASE}"
mkdir -p "$OUT_DIR"

log() { echo "[baseline] $*"; }

log "Writing baseline to $OUT_DIR (phase=$PHASE)"

curl -sf --max-time 20 "$API_BASE/health" > "$OUT_DIR/health.json" || echo '{"error":"health"}' > "$OUT_DIR/health.json"
curl -sf --max-time 20 "$API_BASE/blocks/catalog-counts?region_id=$REGION_ID" > "$OUT_DIR/catalog-counts.json" || echo '{}' > "$OUT_DIR/catalog-counts.json"
curl -sf --max-time 20 "$API_BASE/stats/listing-kind-counts?region_id=$REGION_ID" > "$OUT_DIR/listing-kind-counts.json" || echo '{}' > "$OUT_DIR/listing-kind-counts.json"

if [[ -n "${ADMIN_EMAIL:-}" && -n "${ADMIN_PASSWORD:-}" ]]; then
  TOKEN=$(curl -sf -X POST "$API_BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")
  AUTH="Authorization: Bearer $TOKEN"

  for path in \
    "admin/feed-import/recovery/audit?region=$REGION" \
    "admin/feed-import/recovery/incident?region=$REGION" \
    "admin/feed-import/health" \
    "admin/feed-import/integrity?region=$REGION" \
    "admin/feed-import/recovery/data-quality?region=$REGION" \
    "admin/feed-import/snapshots?region=$REGION&limit=8" \
    "admin/sitemap/metrics"; do
    fname=$(echo "$path" | tr '/?&=' '-' | sed 's/^admin-//')
    curl -sf --max-time 120 "$API_BASE/$path" -H "$AUTH" > "$OUT_DIR/$fname.json" 2>/dev/null \
      || echo "{\"error\":\"$path\"}" > "$OUT_DIR/$fname.json"
  done
else
  log "WARN: ADMIN_EMAIL/PASSWORD not set — admin metrics skipped"
fi

python3 - "$OUT_DIR" "$PHASE" "$REGION" <<'PY'
import json, sys, glob, os
out_dir, phase, region = sys.argv[1:4]
summary = {"phase": phase, "region": region, "files": []}
for f in sorted(glob.glob(os.path.join(out_dir, "*.json"))):
    try:
        with open(f) as fh:
            summary["files"].append({"name": os.path.basename(f), "data": json.load(fh)})
    except Exception as e:
        summary["files"].append({"name": os.path.basename(f), "error": str(e)})
with open(os.path.join(out_dir, "summary.json"), "w") as fh:
    json.dump(summary, fh, indent=2, ensure_ascii=False)
print(json.dumps(summary, indent=2, ensure_ascii=False)[:4000])
PY

log "Done: $OUT_DIR/summary.json"
