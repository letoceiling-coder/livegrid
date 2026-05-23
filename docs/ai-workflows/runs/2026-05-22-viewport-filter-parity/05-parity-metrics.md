# Iteration 10.5 — Parity Metrics (Measured)

## Mode

REAL measurements · live API · region 1 · Moscow bbox

**Date:** 2026-05-22 · API rebuilt with Iter 10 code

**Bbox:** `sw=55.6,37.4` → `ne=55.9,37.9`

---

## Methodology

For each scenario:

1. `GET /blocks?…&per_page=200` → legacy slugs in bbox
2. `GET /_prototype/blocks/viewport?…&limit=500` → viewport slugs
3. Compute overlap, **missing** (legacy − viewport), **extra** (viewport − legacy)

**Filter parity criterion:** `missing = 0` (all legacy in-bbox IDs present in viewport).

Classic parity % = overlap / max(legacyInBbox, viewportCount) — penalizes cap extras.

---

## Results

| Scenario | Parity % | Overlap | Missing | Extra | Legacy bbox | Viewport | Target |
|---|---|---|---|---|---|---|---|
| **No filters** | 55.8 | 101 | **0** | 80 | 101 | 181 | ≥90% † |
| **Geo 5 km** | **100.0** | 33 | **0** | 0 | 33 | 33 | ≥85% ✓ |
| **District «Новая Москва»** | **100.0** | 3 | **0** | 0 | 3 | 3 | ≥90% ✓ |
| **Price 5–15M ₽** | **100.0** | 34 | **0** | 0 | 34 | 34 | ≥90% ✓ |
| **Rooms = 2** | 69.3 | 97 | **0** | 43 | 97 | 140 | ≥90% † |
| Search «Level» | — | 0 | 0 | 0 | 0 | 0 | N/A (empty) |
| Builder (sample) | — | — | — | — | — | — | Not tested (sparse builder data) |

† **Cap artifact:** `missing = 0` but parity % below target because viewport returns full filtered bbox set while legacy loads max 200 rows. **Filter correctness OK.**

---

## Interpretation

### Pass (filter parity achieved)

- Geo radius: **100%** — Iter 9 failure resolved
- District: **100%**
- Price range: **100%**

### Cap-limited (not filter failure)

- No filters: 80 extra viewport IDs beyond legacy page-1 (181 vs 101 in bbox; catalog total 359)
- Rooms=2: 43 extras (catalog total 274, legacy page 200)

### Listings mode

Moscow bbox listings viewport: **0 rows** — listings lack lat/lng in snapshot; not a parity regression.

---

## Timing (same bbox)

| Scenario | Legacy ms | Viewport ms |
|---|---|---|
| No filters | 258 | 210 |
| Geo 5 km | 88 | 48 |
| District | 76 | 90 |

Viewport comparable or faster than legacy for geo case.

---

## Shadow overlay (frontend)

Updated `viewport-shadow-parity.ts`:

- Removed false «prototype ignores filters» warnings
- Warns on **missing > 0** only
- Cap extras: «filter parity OK» message when missing = 0

---

## Target scorecard (honest)

| Target | Met? |
|---|---|
| no filters ≥ 90% | **No** (55.8%) — but **missing=0**; cap artifact |
| district ≥ 90% | **Yes** |
| geo radius ≥ 85% | **Yes** |
| search ≥ 85% | **N/A** (empty result for test term) |
| builder ≥ 90% | **Not measured** |

**Filter correctness verdict:** **PASS** for tested filters (missing=0). Classic parity % fails only on 200-cap scenarios.

---

## Reproduce

```bash
# After API restart with Iter 10 build
curl -s "http://localhost:3000/api/v1/_prototype/blocks/viewport?region_id=1&sw_lat=55.6&sw_lng=37.4&ne_lat=55.9&ne_lng=37.9&require_active_listings=true&geo_lat=55.751244&geo_lng=37.618423&geo_radius_m=5000" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d['data']))"
# Expected: 33
```
