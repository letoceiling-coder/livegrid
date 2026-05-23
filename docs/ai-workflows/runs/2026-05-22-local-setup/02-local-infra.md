# 02 — Local infrastructure (PostgreSQL + Redis)

**Date:** 2026-05-22  
**Constraint:** No sudo, no Docker (Docker socket unavailable in WSL session).

## Options evaluated

| Option | Result |
|--------|--------|
| `sudo systemctl start postgresql redis-server` | **Blocked** — sudo requires password |
| `docker compose up -d postgres redis` | **Blocked** — no Docker daemon |
| EDB PostgreSQL binaries (curl) | **403** from CDN |
| **Miniforge (conda-forge)** | **Works** — user-space install, no root |

## Installed stack (verified)

```bash
# One-time install (already done on this machine):
curl -fsSL -o /tmp/miniforge.sh \
  https://github.com/conda-forge/miniforge/releases/latest/download/Miniforge3-Linux-x86_64.sh
bash /tmp/miniforge.sh -b -p ~/miniforge
~/miniforge/bin/mamba install -y -c conda-forge postgresql redis-server postgis
```

| Service | Binary | Version | Port |
|---------|--------|---------|------|
| PostgreSQL | `~/miniforge/bin/postgres` | 16.x (conda; may show 18 after postgis dep) | 5432 |
| PostGIS | extension in `lg_development` | 3.x | — |
| Redis | `~/miniforge/bin/redis-server` | 8.6.2 | 6379 |

## Data directories (isolated, local only)

```
~/livegrid/.local/infra/
├── pgdata/           # PostgreSQL cluster
├── redis-data/       # Redis RDB/AOF
└── logs/
    ├── postgres.log
    └── redis.log
```

## Credentials (match docker-compose.yml dev defaults)

From `~/livegrid/docker-compose.yml`:

| Variable | Local value |
|----------|-------------|
| DB name | `lg_development` |
| DB user | `lg_admin` |
| DB password | `lg_dev_password` |
| Redis | `redis://localhost:6379` (no auth) |

**Not production.** Production PM2 config uses `lg_production` — never use locally.

## Start / stop commands

### Helper script (recommended)

```bash
chmod +x ~/livegrid/scripts/local-infra-start.sh
~/livegrid/scripts/local-infra-start.sh
```

### Manual

```bash
MF=~/miniforge/bin
PGDATA=~/livegrid/.local/infra/pgdata

# PostgreSQL
$MF/pg_ctl -D $PGDATA -l ~/livegrid/.local/infra/logs/postgres.log -o "-p 5432" start
$MF/pg_isready -h localhost -p 5432

# Redis
$MF/redis-server --daemonize yes --port 6379 \
  --dir ~/livegrid/.local/infra/redis-data \
  --logfile ~/livegrid/.local/infra/logs/redis.log
$MF/redis-cli ping   # → PONG
```

### Stop

```bash
~/miniforge/bin/pg_ctl -D ~/livegrid/.local/infra/pgdata stop
~/miniforge/bin/redis-cli shutdown
```

## Verify ports

```bash
ss -tlnp | grep -E ':5432|:6379'
# Expected: postgres on 5432, redis on 6379
```

## Alternative: Docker (when available)

If Docker is installed later:

```bash
cd ~/livegrid
docker compose up -d postgres redis
# Uses same credentials as table above
```

Optional profiles in `docker-compose.yml`:

- `--profile search` → Meilisearch `:7700`
- `--profile monitoring` → Prometheus `:9090`, Grafana `:3001`

Meilisearch is **optional** — catalog search falls back to PostgreSQL without `MEILI_HOST`.

## If you have sudo (native services)

```bash
sudo apt install postgresql-16 postgresql-16-postgis-3 redis-server
sudo systemctl enable --now postgresql redis-server
# Then create lg_development + lg_admin with lg_dev_password
```

→ [03-env-setup.md](./03-env-setup.md)
