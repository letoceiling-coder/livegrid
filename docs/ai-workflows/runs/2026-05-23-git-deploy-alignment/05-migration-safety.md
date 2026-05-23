# Iter 46 — Phase 5: Migration Safety

## Deploy order (mandatory)

```
prisma generate → prisma migrate deploy → build → pm2 reload
```

Implemented in `deploy-full.sh` lines 30–66. **Never** restart API before migrate.

## Rules

| Rule | Status |
|------|--------|
| Additive migrations only | ✓ enforced by review process |
| `migrate deploy` in production | ✓ in deploy-full.sh |
| No `migrate reset` in production | ✓ not in any deploy script |
| Rollback notes per migration | ✓ in ai-workflow run docs |

## Current chain

39 migrations at `packages/database/prisma/migrations/`

Production (lg.git @ 43b5026) is missing migrations after `20260522120000` geo lineage — **12 pending** including CRM + ownership.

## Duplicate timestamp

`20260523180000_crm_analytics_snapshots` and `20260523180000_listing_ownership_lifecycle` — safe (unique folder names).

## First deploy after consolidation

Expect `prisma migrate deploy` to apply:

- CRM snapshots, attribution, pipeline, forecast
- Listing ownership lifecycle (visibility, owner_user_id)
- Geo materialization snapshots

**Pre-deploy backup:**

```bash
ssh root@85.198.64.93
pg_dump -Fc lg_production > /tmp/lg_pre_iter46_$(date +%Y%m%d).dump
```

## Rollback

| Layer | Action |
|-------|--------|
| Code | `git checkout` + redeploy |
| DB | Manual reverse SQL only — no auto-down |
| Migrations | Forward-only; test on staging DB first |

## Local dev

```bash
cd ~/livegrid
pnpm --filter @lg/database exec prisma migrate deploy
```

Never use `migrate dev` against production DATABASE_URL.
