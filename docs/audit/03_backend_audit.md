# STEP 3 — Backend audit (Laravel)

**Audit date:** 2026-03-23

---

## 3.1 Models & relationships

| Model | Table | Key relations / notes |
|-------|-------|----------------------|
| `Complex` | `blocks` | `buildings()`, `apartments()`, `builder()`, `district()` → **`District`** (`districts`) |
| `Apartment` | `apartments` | `building()`, `complex()` via building, `finishing()`, `roomType()`, `locked_fields` JSON, `source` |
| `Building` | `buildings` | `complex()`, `apartments()` |
| `Builder`, `District`, `Subway`, etc. | respective tables | Reference data |

**Mismatch (data vs API):** Migration `2025_12_01_000001_create_blocks_table.php` sets `district_id` **foreign key to `regions`**, while `Complex::district()` uses **`District`** model (`districts`). If production stores region IDs in `district_id`, `/filters` districts stay empty and CRM district filter misaligns.

---

## 3.2 Controllers — responsibilities

**Public V1** (`app/Http/Controllers/Api/V1/`):

- `ComplexController` — index/show/apartments; uses `SearchService` for list; map payload via `MapController` patterns elsewhere
- `ApartmentController` — **only `show()`** in codebase; **no `index()`** despite route (see `04_api_audit.md`)
- `MapController` — `complexes()` reads `complexes_search` + joins
- `ReferenceController` — `filters()` aggregates builders, districts, subways, finishing, room types, building types
- `SearchComplexesController` — text search on `complexes_search`

**CRM** (`app/Http/Controllers/Api/Crm/`):

- Full CRUD for complexes, apartments, builders, districts
- `bulk()` on apartments: `delete`, `update_status`, `assign_complex`
- Soft delete: `trashed`, `restore`
- `history` (property changes), `lock` / `unlock` for feed-protected fields
- Feed: `status`, `runDownload`, `runSync`

---

## 3.3 Feed import (`FeedImporter`)

**Path:** `app/Services/Catalog/Import/FeedImporter.php`

- Streams XML; maps to blocks/buildings/apartments via `UpsertService` / mappers
- Respects `locked_fields` on apartments when updating from feed
- **Risk:** In non-streaming code paths, variable **`$allProcessedExternalIds`** may be used before initialization (reported in static review) — verify all branches set it before `Apartment::whereNotIn('external_id', $allProcessedExternalIds)`

**Related:** `FeedDownloadCommand`, `CrmFeedController`, `app/Services/Catalog/Feed/FeedDownloader.php`

---

## 3.4 Search / map (`SearchService`, `SyncComplexesSearchCommand`)

- **`complexes_search`** denormalized table — populated by `SyncComplexesSearchCommand` / importers
- If table empty or out of sync, **`/api/v1/map/complexes`** and **`/api/v1/search/complexes`** return empty/zero totals despite `complexes` count

---

## 3.5 Middleware & auth

- `auth:sanctum` + `crm.admin` for CRM routes ([`routes/api.php`](../../routes/api.php))
- `EnsureCrmAdmin` — CRM gate

---

## 3.6 Issues by severity

### [CRITICAL]

| # | Description | Location | Impact |
|---|-------------|----------|--------|
| C1 | **`GET /api/v1/apartments`** routes to missing `index()` | `routes/api.php` L27; `ApartmentController` | **HTTP 500** on production |
| C2 | **`price_per_meter`** used without DB column / accessor | `ApartmentController::show` | Possible error or wrong value in apartment JSON |
| C3 | **`$apartment->building->...`** without null-safe | `ApartmentController::show` | **500** if orphan apartment |

### [HIGH]

| # | Description | Location | Impact |
|---|-------------|----------|--------|
| H1 | `district_id` FK → `regions` vs `Complex::district()` → `districts` | migrations + `Complex.php` | Empty/wrong district in API & CRM |
| H2 | `complexes_search` not synced | map/search endpoints | Empty map/search UX |
| H3 | FeedImporter `$allProcessedExternalIds` | `FeedImporter.php` | Potential runtime error on certain import paths |

### [MEDIUM]

| # | Description | Location | Impact |
|---|-------------|----------|--------|
| M1 | Duplicate / overlapping search logic | `SearchService` vs controller queries | Maintenance cost |
| M2 | Large response payloads on some list endpoints | Various | Performance under load |

---

## 3.7 Positive findings

- CRM API surface is **rich** (bulk, soft delete, history, lock/unlock, feed).
- Apartment **locked_fields** + **source** align feed vs manual edits.
- **Property change logging** via observer/concern supports audit trail.
