#!/usr/bin/env bash
set -eu
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
MIG_DIR="$ROOT/packages/database/prisma/migrations"
if [ ! -d "$MIG_DIR" ]; then
  echo "FAIL: migrations directory missing"
  exit 1
fi
empty=0
for d in "$MIG_DIR"/*/; do
  if [ ! -f "${d}migration.sql" ]; then
    echo "FAIL: missing migration.sql in $d"
    empty=1
  fi
done
if [ "$empty" -ne 0 ]; then
  exit 1
fi
count=$(find "$MIG_DIR" -mindepth 1 -maxdepth 1 -type d | wc -l)
echo "OK: $count migration folders with migration.sql"
