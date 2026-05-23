# Iter 47 — Phase 2: Backup Strategy

## MANDATORY before cutover

Run on production **before** `deploy-from-git.sh`:

```bash
TS=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/var/backups/lg-pre-cutover-$TS
mkdir -p "$BACKUP_DIR"

# 1. Postgres full dump
pg_dump -Fc -U lg_admin lg_production > "$BACKUP_DIR/lg_production_$TS.dump"

# 2. Release SHA snapshot
cd /var/www/lg && git rev-parse HEAD > "$BACKUP_DIR/release_sha.txt"
git remote -v > "$BACKUP_DIR/git_remote.txt"

# 3. Uploads (484M — tar, not rsync delete)
tar czf "$BACKUP_DIR/uploads_$TS.tar.gz" -C /var/www/lg uploads/

# 4. .env copy (secrets — restrict permissions)
cp -a /var/www/lg/.env "$BACKUP_DIR/.env.backup"
chmod 600 "$BACKUP_DIR/.env.backup"

ls -lh "$BACKUP_DIR"
```

## Expected artifacts

| File | Purpose |
|------|---------|
| `lg_production_*.dump` | Full DB rollback |
| `uploads_*.tar.gz` | Media rollback |
| `release_sha.txt` | Code rollback target (`43b5026`) |
| `.env.backup` | Env restore if overwritten |

## Retention

Keep minimum **7 days** on server or copy to off-site storage.

## Restore quick reference

```bash
# DB only (destructive to current data)
pg_restore -c -d lg_production /var/backups/lg-pre-cutover-*/lg_production_*.dump

# Code only
cd /var/www/lg && git checkout 43b5026 && bash deploy/deploy-full.sh
```
