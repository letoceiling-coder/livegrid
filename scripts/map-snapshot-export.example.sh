#!/usr/bin/env bash
# EXAMPLE — run ON PRODUCTION SERVER ONLY (read-only pg_dump).
# Do NOT run from local machine against remote production host.
#
# Copy to server: /var/www/lg/scripts/map-snapshot-export.example.sh
# Usage on server:
#   bash map-snapshot-export.example.sh /tmp/lg_map_msk_$(date +%Y%m%d).dump
#
# Requires: postgres client, access as user with SELECT on lg_production

set -euo pipefail

OUT="${1:-/tmp/lg_map_msk.dump}"
DB="${PGDATABASE:-lg_production}"

if [[ "${ALLOW_PROD_SNAPSHOT:-}" != "yes" ]]; then
  echo "Set ALLOW_PROD_SNAPSHOT=yes to confirm intentional read-only export."
  exit 1
fi

echo "Exporting map-related tables from ${DB} → ${OUT}"
echo "This is READ-ONLY (pg_dump does not modify source DB)."

pg_dump \
  --dbname="$DB" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --verbose \
  --file="$OUT" \
  --table=feed_regions \
  --table=room_types \
  --table=finishings \
  --table=building_types \
  --table=districts \
  --table=subways \
  --table=builders \
  --table=blocks \
  --table=block_addresses \
  --table=block_images \
  --table=block_subways \
  --table=buildings \
  --table=building_addresses \
  --table=listings \
  --table=listing_apartments \
  --table=listing_houses \
  --table=listing_land \
  --table=listing_commercial \
  --table=listing_parking \
  --table=listing_apartment_banks \
  --table=listing_apartment_contracts \
  --table=site_settings \
  --table=navigation_menus \
  --table=navigation_items

echo "Done. Transfer to dev machine:"
echo "  scp root@85.198.64.93:${OUT} ~/livegrid-snapshots/"
echo "Never commit dump files to git."
