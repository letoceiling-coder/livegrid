# STEP 4 — Public API audit (`/api/v1/*`)

**Audit date:** 2026-03-23  
**Route file:** [`routes/api.php`](../../routes/api.php)

---

## 4.1 Route inventory (public V1)

| Method | Path | Controller | Verified locally |
|--------|------|------------|------------------|
| GET | `/api/v1/complexes` | `ComplexController@index` | Yes |
| GET | `/api/v1/complexes/{slug}` | `ComplexController@show` | Yes |
| GET | `/api/v1/complexes/{slug}/apartments` | `ComplexController@apartments` | Yes |
| GET | `/api/v1/apartments` | `ApartmentController@index` | **Broken** — method missing |
| GET | `/api/v1/apartments/{slug}` | `ApartmentController@show` | Partial — code risks |
| GET | `/api/v1/map/complexes` | `MapController@complexes` | Yes (empty if search table empty) |
| GET | `/api/v1/filters` | `ReferenceController@filters` | Yes (`districts: []` on sampled host) |
| GET | `/api/v1/search/complexes` | `SearchComplexesController@index` | Yes |
| GET | `/api/v1/health` | Closure | Yes |

**Production samples (2026-03-23, `https://dev.livegrid.ru`):**

- `GET /api/v1/complexes?per_page=1` → **200**, `meta.total` ≈ **1292**
- `GET /api/v1/filters` → **200**, **districts = []**, subways/builders non-zero
- `GET /api/v1/apartments` → **500**
- `GET /api/v1/map/complexes` / `search/complexes` → **200** with **zero/empty** results in spot checks (likely `complexes_search` / sync)

---

## 4.2 Contract mismatches

| Issue | Detail |
|-------|--------|
| Apartments list | Route declares `index`; controller has **only `show()`** → runtime error |
| Apartment show | Uses `price_per_meter` (no column); assumes `building` always present |
| Filters districts | `ReferenceController` loads `District::orderBy('name')` — empty if FK/data model mismatch (`regions` vs `districts`) |
| Frontend expectations | Redesign catalog/map may expect list apartments + rich filters — server does not match if list 500 |

---

## 4.3 CRM API (under `/api/v1/crm/*`)

Protected by `auth:sanctum` + `crm.admin`. Inventory matches [`routes/api.php`](../../routes/api.php) L42–64: dashboard, complexes resource, apartments resource + bulk/trashed/restore/history/lock/unlock, builders, districts, feed.

**Not audited here in depth:** rate limiting, CORS for separate origins, Sanctum cookie vs SPA — assume same-site deployment.

---

## 4.4 Issues by severity (public API)

### [CRITICAL]

| # | Endpoint | Problem |
|---|----------|---------|
| C1 | `GET /api/v1/apartments` | Missing `ApartmentController::index` → **500** |

### [HIGH]

| # | Endpoint | Problem |
|---|----------|---------|
| H1 | `GET /api/v1/filters` | Empty districts when `districts` table / FK inconsistent |
| H2 | `GET /api/v1/map/complexes`, `search/complexes` | Empty when `complexes_search` empty or stale |

### [MEDIUM]

| # | Endpoint | Problem |
|---|----------|---------|
| M1 | `GET /api/v1/apartments/{slug}` | Null building / missing accessor edge cases |
| M2 | Pagination defaults | Document `per_page` max for all list endpoints |

---

## 4.5 Recommendations (API layer)

1. Implement **`ApartmentController::index`** or remove route until ready.
2. Fix **`ApartmentController::show`**: null-safe building; remove or implement **`price_per_meter`** (computed attribute or column).
3. Align **`blocks.district_id`** with either **`regions`** or **`districts`** and fix `Complex::district()` + seed data.
4. Run / schedule **`complexes:sync-search`** (or equivalent) after imports and document in deploy.
