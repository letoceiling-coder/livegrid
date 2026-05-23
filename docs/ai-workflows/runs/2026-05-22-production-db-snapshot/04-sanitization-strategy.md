# 04 — Sanitization strategy

**Date:** 2026-05-22  
**When:** After restore into **`lg_development` only** — never run against production

---

## Sensitive data inventory (from Prisma schema)

### Critical — remove or truncate

| Table / column | Sensitive content |
|----------------|-------------------|
| `users.email`, `phone` | PII |
| `users.password_hash` | Credentials |
| `users.telegram_id`, `telegram_username` | Identity |
| `sessions.refresh_token_hash` | Auth tokens |
| `telegram_auth_codes.code` | OTP |
| `requests.*` | CRM leads, phone, email |
| `audit_events` | User actions |
| `telegram_notify_*` | Chat IDs, approval workflow |
| `favorites`, `user_collections*` | User behavior |

### High — mask if exported

| Table / column | Action |
|----------------|--------|
| `sellers.full_name`, `phone`, `email`, `notes` | Mask or exclude table + NULL FK |
| `site_settings` where `field_type = 'SECRET'` | Clear value |
| `site_settings.key` ∈ integrations | See list below |
| `listings.address` | Keep for map realism; optional blur for non-map kinds |
| `users` in `updated_by` FK columns | NULL after user delete |

### Keep realistic (map data)

| Data | Reason |
|------|--------|
| Block names, slugs, descriptions | Sidebar |
| `latitude`, `longitude` | Markers / PostGIS |
| Prices, areas, rooms | Filters |
| District / subway names | Filters |
| Public CDN image URLs | Card thumbnails |
| `feed_regions.map_center_*` | Map default center |

---

## site_settings keys

### Clear (secrets)

```
telegram_bot_token
telegram_notify_chat_id
telegram_login_bot_username
tg_news_mtproto_session
```

### Optional clear (use local dev key instead)

```
yandex_maps_api_key
```

### Keep (map / public site)

```
office_lat, office_lng, office_title
company_name, phone_main (can mask phone if desired)
meta_description, site_title
```

Seed from `pnpm db:seed` restores safe placeholder integration values.

---

## Automated sanitization script

**Path:** `~/livegrid/scripts/sanitize-local-map-snapshot.sql`

**Guards:**

```sql
IF current_database() <> 'lg_development' THEN RAISE EXCEPTION ...
```

**Actions:**

1. Clear integration secrets in `site_settings`
2. Truncate auth/CRM/user-collection/import tables if present
3. `DELETE FROM users`
4. Mask `sellers` PII; NULL user FKs
5. `REFRESH MATERIALIZED VIEW CONCURRENTLY catalog_apartment_active_mv`

**After script:**

```bash
cd ~/livegrid && set -a && source .env && set +a && pnpm db:seed
```

Recreates local admin: `admin@livegrid.ru` / `admin123!`

---

## If sellers table excluded from export

Before restore on local, listings may reference missing sellers. Either:

```sql
UPDATE listings SET seller_id = NULL WHERE seller_id IS NOT NULL;
```

Or export sellers and mask (script handles mask).

---

## Dump file hygiene

| Rule | Detail |
|------|--------|
| Storage | `~/livegrid-snapshots/` chmod 700 |
| Git | Add `*.dump`, `*.sql.gz` to `.gitignore` |
| Sharing | Never upload unsanitized dumps |
| Retention | Delete when no longer needed |
| Label files | `lg_map_msk_YYYYMMDD_sanitized` after processing |

---

## Sanitized vs unsanitized workflow

```
Production DB
    │ pg_dump (read-only)
    ▼
 raw.dump  ──scp──►  dev machine
                          │
                          ▼
                   pg_restore → lg_development
                          │
                          ▼
              sanitize-local-map-snapshot.sql
                          │
                          ▼
                     pnpm db:seed
                          │
                          ▼
                   safe local dev DB
```

→ [05-local-restore-plan.md](./05-local-restore-plan.md)
