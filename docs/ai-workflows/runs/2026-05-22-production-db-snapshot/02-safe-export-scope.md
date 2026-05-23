# 02 — Safe export scope

**Date:** 2026-05-22  
**Principle:** Minimum data for realistic `/map` development

---

## Three export tiers

### Tier M — Map Minimal (~fast, daily dev)

**Goal:** Sidebar + markers + basic filters; small DB.

| Include | Scope |
|---------|--------|
| `feed_regions` | Row for `msk` only (`code='msk'`) |
| Reference | All rows (small: rooms, finishings, building_types) |
| `districts`, `subways`, `builders` | `region_id = 1` (MSK) |
| `blocks` + children | Top **50** blocks by active listing count in MSK |
| `buildings` + addresses | Only for selected blocks |
| `listings` + kind tables | Active + published apartments linked to those blocks |
| `site_settings` | Keys: `yandex_maps_api_key`, `office_*`, map group only |

**Exclude entirely:** users, sessions, sellers (set `seller_id` NULL), news, media, import_batches, CRM.

**Estimated size:** tens of MB.

---

### Tier R — Map Realistic (recommended)

**Goal:** Production-like filters, geo presets, performance testing.

| Include | Scope |
|---------|--------|
| All Tier M tables | Full MSK reference (`region_id=1`) |
| `blocks` + children | **All** MSK blocks (~1.3k) |
| `buildings` | All MSK |
| `listings` + apartments | All MSK `ACTIVE`/`RESERVED` + `is_published=true` |
| `listings` houses/land/commercial | Optional subset or all published |
| `site_settings` | All non-SECRET groups except integrations |
| `navigation_menus`, `navigation_items` | Optional |

**Exclude:** users, sessions, auth, audit, requests, telegram, favorites, collections, import_batches, media binary metadata.

**Estimated size:** hundreds of MB – low GB (depends on listing count).

---

### Tier F — Full catalog MSK (heavy)

Entire MSK catalog including inactive listings, all import_batches, sellers (sanitized). Use only if debugging archive/import edge cases.

**Not recommended** for routine map UI work.

---

## FK-safe table list (Tier R)

Export/import in this order:

```
1.  feed_regions          (filter: msk)
2.  room_types
3.  finishings
4.  building_types
5.  districts             (region_id=1)
6.  subways                (region_id=1)
7.  builders               (region_id=1)
8.  blocks                 (region_id=1)
9.  block_addresses
10. block_images
11. block_subways
12. buildings              (region_id=1)
13. building_addresses
14. listings               (region_id=1, filtered)
15. listing_apartments
16. listing_houses
17. listing_lands
18. listing_commercials
19. listing_parkings
20. listing_apartment_banks      (if FK exists)
21. listing_apartment_contracts
22. site_settings            (selected keys)
23. navigation_menus         (optional)
24. navigation_items         (optional)
```

**Do not export** `_prisma_migrations` from production — use local Prisma migrate deploy.

---

## Listing filter (Tier R SQL predicate)

```sql
region_id = 1
AND is_published = true
AND status IN ('ACTIVE', 'RESERVED')
```

For object-type tabs add `kind IN ('APARTMENT','HOUSE','LAND','COMMERCIAL')` as needed.

---

## Comparison with current local approach

| Approach | Realism | Safety | Status |
|----------|---------|--------|--------|
| Catalog mirror script (`populate-local-map-data.ts`) | Medium | Highest | ✅ Done (11 blocks) |
| TrendAgent `FEED_LOCAL_DIR` | High | High | Blocked (403) |
| **Production DB snapshot (this strategy)** | **Highest** | High if read-only export + sanitize | 📋 Documented |

---

## Operator checklist before export

- [ ] Confirm SSH/session on **production server** (not local machine pointing to prod)
- [ ] Use read-only `pg_dump` only
- [ ] Export file stored **outside** git
- [ ] No production `.env` copied to dev machine
- [ ] Transfer via `scp`/`rsync` to WSL, not committed

→ [03-snapshot-strategy.md](./03-snapshot-strategy.md)
