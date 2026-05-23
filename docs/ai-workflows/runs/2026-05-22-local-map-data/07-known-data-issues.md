# 07 — Known data issues

**Date:** 2026-05-22

## Environment / import blockers

### 1. TrendAgent HTTP 403

```bash
curl -s -o /dev/null -w "%{http_code}" https://dataout.trendagent.ru/msk/about.json
# 403
```

Full feed import cannot run from this WSL egress without `FEED_LOCAL_DIR` dump.

**Mitigation:** Download feed on allowed network → `FEED_LOCAL_DIR=/path/to/TrendAgent/data`

### 2. `pnpm dev:api` broken

`FeedImportService` DI failure under `tsx watch`. Use `pnpm build:api && node apps/api/dist/main.js`.

### 3. Schema drift (`listings.lat/lng`)

Migrations missing columns present in Prisma schema. Local fix: `npx prisma db push` (already applied).

## Data quality (mirror dataset)

### 4. Slug suffix `-local`

Mirrored blocks use `{slug}-local` to avoid unique constraint clashes on re-seed. URLs differ from production slugs.

### 5. No buildings / full apartments feed

Mirror creates 2 simplified listings per block, not real apartment inventory from `apartments.json`:

- No `buildings` rows
- No `deadline` diversity (only «Сдан» from derived data)
- Price range narrower than production

### 6. Test block remnant

Early smoke test block `Test ЖК Local` (id=1) remains in DB alongside mirrored data.

### 7. House / land / commercial tabs empty

Script only seeds apartments. Add manual listings or feed import for other kinds.

### 8. Room types / finishings empty

Mirror does not copy reference tables (`room-types`, `finishings`). Room/finishing filters may be empty until feed import or reference seed.

### 9. Yandex Maps key null

```json
GET /content/maps-config → {"apiKey":null}
```

Map UI may render sidebar without map tiles until key configured.

### 10. Redis cache staleness

After manual DB writes, run `redis-cli FLUSHDB` or wait for TTL (~45–60s on catalog keys).

### 11. CDN image dependency

Block images point to `cdn-dataout.trendagent.ru`. Offline or blocked CDN → broken thumbnails (markers unaffected).

## Not issues (by design)

- Public `/blocks` hides blocks without active published apartments — mirror satisfies this
- Catalog mirror reads production **API**, not DB — allowed by safe mode rules
- `import_batches` empty — feed pipeline not invoked

→ [08-final-local-map-status.md](./08-final-local-map-status.md)
