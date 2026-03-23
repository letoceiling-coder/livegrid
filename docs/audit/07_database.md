# STEP 7 — Database audit

**Audit date:** 2026-03-23  
**Source:** `database/migrations/*.php` (inventory via project tree)

---

## 7.1 Core tables (catalog)

| Table | Purpose |
|-------|---------|
| `blocks` | Residential complexes (model `Complex`) — geo, builder, district_id, SEO, etc. |
| `buildings` | Buildings within a complex |
| `apartments` | Units; `external_id`, `locked_fields`, `source`, soft deletes |
| `builders`, `districts`, `subways`, `finishing`, `room_types`, `building_types` | Reference data |
| `regions` | Regional hierarchy; **blocks.district_id** FK targets **`regions`** in initial migration |
| `complexes_search` | Denormalized search/map index |
| `property_changes` | Audit log of apartment field changes (if migration applied) |

---

## 7.2 Notable migrations (recent / API-related)

- `2026_03_18_000001_add_complex_fields_to_blocks_table.php` — extra complex fields
- `2026_03_18_000002_add_apartment_fields_for_frontend.php` — frontend-oriented apartment columns
- `2026_03_18_000003_add_line_to_subways_table.php` — subway line
- `2026_03_18_000010_create_complexes_search_table.php` — search table

**Verify on server:** `php artisan migrate:status` — all applied on production.

---

## 7.3 Indexes & performance (high level)

- `complexes_search` should have indexes matching `SearchService` / `MapController` filters (geo bbox, text).
- `apartments`: indexes on `complex_id`, `status`, `external_id` (confirm in migrations).
- Full-text or trigram search — document if added later.

---

## 7.4 Enum / status fields

Document apartment `status`, complex `status`, and feed `source` values in code (`Apartment` / `Complex` constants or casts) — keep in sync with CRM dropdowns.

---

## 7.5 Data integrity risks

| Risk | Detail |
|------|--------|
| `district_id` | FK to `regions` but app uses `District` — referential integrity does not match app semantics |
| Orphan apartments | `building_id` null or missing building breaks `ApartmentController@show` |
| Stale search | `complexes_search` out of sync with `blocks` |

---

## 7.6 Recommendations

1. Single source of truth for **district**: either migrate FK to `districts` or change `Complex::district()` to `Region`.
2. DB constraint or application guard: **apartment must have valid building** if API assumes it.
3. Scheduled job: **sync complexes_search** after import + nightly.
