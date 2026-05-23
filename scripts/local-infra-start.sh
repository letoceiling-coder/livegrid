#!/usr/bin/env bash
# Start local PostgreSQL + Redis without sudo (Miniforge user install).
# Safe: only touches ~/livegrid/.local/infra and ~/miniforge.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INFRA="$ROOT/.local/infra"
PGDATA="$INFRA/pgdata"
LOGS="$INFRA/logs"
MF="$HOME/miniforge/bin"

mkdir -p "$LOGS" "$INFRA/redis-data"

if [[ ! -x "$MF/postgres" ]]; then
  echo "Miniforge PostgreSQL not found. Install:"
  echo "  curl -fsSL -o /tmp/miniforge.sh https://github.com/conda-forge/miniforge/releases/latest/download/Miniforge3-Linux-x86_64.sh"
  echo "  bash /tmp/miniforge.sh -b -p ~/miniforge"
  echo "  ~/miniforge/bin/mamba install -y -c conda-forge postgresql=16 postgis redis-server"
  exit 1
fi

if [[ ! -f "$PGDATA/PG_VERSION" ]]; then
  echo "Initializing PostgreSQL cluster at $PGDATA ..."
  "$MF/initdb" -D "$PGDATA" -U lg_admin --auth-host=scram-sha-256 --auth-local=trust -E UTF8
  "$MF/pg_ctl" -D "$PGDATA" -l "$LOGS/postgres.log" -o "-p 5432" start
  sleep 2
  "$MF/psql" -U lg_admin -d postgres -c "ALTER USER lg_admin WITH PASSWORD 'lg_dev_password';"
  "$MF/psql" -U lg_admin -d postgres -c "CREATE DATABASE lg_development OWNER lg_admin;"
  "$MF/psql" -U lg_admin -d lg_development -c "CREATE EXTENSION IF NOT EXISTS postgis;"
else
  "$MF/pg_ctl" -D "$PGDATA" -l "$LOGS/postgres.log" -o "-p 5432" status >/dev/null 2>&1 \
    || "$MF/pg_ctl" -D "$PGDATA" -l "$LOGS/postgres.log" -o "-p 5432" start
fi

if ! "$MF/redis-cli" ping >/dev/null 2>&1; then
  "$MF/redis-server" --daemonize yes --port 6379 --dir "$INFRA/redis-data" --logfile "$LOGS/redis.log"
fi

echo "PostgreSQL: $( "$MF/pg_isready" -h localhost -p 5432 )"
echo "Redis: $( "$MF/redis-cli" ping )"
