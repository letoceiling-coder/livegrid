# Iter 47 — Phase 4: Migration Impact Audit

## Pending migrations (12)

| Migration | Domain | Lock risk | Table rewrite | Notes |
|-----------|--------|-----------|---------------|-------|
| `20260522120000_listing_geo_lineage` | geo | Low | No | Additive columns |
| `20260522230000_listing_geo_review_decisions` | geo | Low | No | New table |
| `20260523010000_geo_materialization_snapshots` | geo | Low | No | New snapshot table |
| `20260523120000_crm_request_lifecycle` | CRM | Low | No | Request columns + events |
| `20260523140000_crm_last_activity_sla` | CRM | Low | No | SLA fields |
| `20260523160000_crm_notifications` | CRM | Low | No | New `crm_notifications` table |
| `20260523180000_crm_analytics_snapshots` | CRM | Low | No | Snapshot tables |
| `20260523180000_listing_ownership_lifecycle` | ownership | **Medium** | No | UPDATE backfill on `listings` |
| `20260523190000_crm_attribution_snapshots` | CRM | Low | No | New tables |
| `20260523200000_crm_pipeline_lifecycle` | CRM | Low | No | Pipeline fields |
| `20260523210000_crm_conversion_quality` | CRM | Low | No | Quality metrics |
| `20260523220000_crm_operational_forecast` | CRM | Low | No | Forecast tables |

## Highest impact: listing ownership

```sql
-- Backfill UPDATE on all listings rows (visibility + owner_user_id)
-- Then CREATE INDEX x3 + FK
-- Estimated: seconds to low minutes depending on listing count
-- AccessExclusiveLock on ALTER COLUMN SET NOT NULL — brief
```

## Downtime estimate

| Phase | Duration |
|-------|----------|
| migrate deploy (12) | 1–5 min |
| API build | 3–5 min |
| web build | 2–3 min |
| pm2 reload | <5 sec |
| **Total user-visible** | **~30 sec API blip** during pm2 reload |

No maintenance page required unless listing count >500k (backfill slow).

## Production-safe notes

- All migrations additive — no DROP TABLE
- No `prisma migrate reset`
- Run during low traffic (02:00–06:00 MSK recommended)
- **pg_dump mandatory** before migrate

## Execution order

Prisma applies in timestamp order automatically via `migrate deploy`.
