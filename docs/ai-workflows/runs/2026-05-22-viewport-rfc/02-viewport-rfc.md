# Iteration 8.1 — Viewport Query RFC

## Status

**PROPOSAL ONLY** — no production endpoint. Isolated prototype at `GET /api/v1/_prototype/*/viewport`.

---

## Problem Statement

Current map loads up to 200 entities per filter change, independent of visible bounds. At region scale (359 blocks, 14 917 listings) this creates:

1. **Completeness gap** — majority of catalog invisible on map
2. **Payload pressure** — ~900 KB blocks / ~370 KB listings per load
3. **Future ceiling** — raising `per_page` linearly increases JSON and cluster rebuild cost

Viewport queries would fetch **only entities inside the current map bounds**, enabling higher effective coverage without loading the full catalog.

---

## Design Principles

| Principle | Rationale |
|---|---|
| Additive, not replacement | Keep `/blocks` and `/listings` unchanged |
| Prototype first | `_prototype` prefix, env-gated, DEV-only frontend |
| Filter compatibility | Viewport is an **additional** constraint, not a bypass |
| Client clustering unchanged | Yandex Clusterer remains; no server-side cluster replacement |
| Explicit limits | `limit` cap prevents unbounded bbox responses |

---

## Proposed Endpoint Shapes

### Option A — Dedicated viewport routes (recommended for prototype → v2)

```
GET /api/v1/blocks/viewport
GET /api/v1/listings/viewport
```

**Prototype mirror (implemented):**

```
GET /api/v1/_prototype/blocks/viewport
GET /api/v1/_prototype/listings/viewport
```

### Option B — Extend existing routes (NOT recommended for v1)

```
GET /api/v1/blocks?sw_lat=…&sw_lng=…&ne_lat=…&ne_lng=…
```

**Rejected for production v1:** breaks cache keys, confuses pagination semantics, risks accidental rollout.

---

## Query Parameters

| Param | Type | Required | Notes |
|---|---|---|---|
| `region_id` | int | yes | Same as catalog; geo presets still scoped to region |
| `sw_lat` | float | yes | South-west corner latitude (WGS84) |
| `sw_lng` | float | yes | South-west corner longitude |
| `ne_lat` | float | yes | North-east corner latitude |
| `ne_lng` | float | yes | North-east corner longitude |
| `zoom` | int 0–22 | optional | Client hint for limit tuning / analytics; server may ignore |
| `limit` | int 1–500 | optional | Default 300 prototype; production TBD |

**Invalid bbox:** `sw_lat >= ne_lat` OR `sw_lng >= ne_lng` → empty `data[]` + meta reason (prototype behavior).

### Future filter forwarding (not in prototype SQL yet)

All catalog params from `buildBlocksSearchParams` / `buildListingsSearchParams` should eventually intersect bbox results:

- `search`, `district`, `subway`, `builder`, `rooms`, `price_min`, `price_max`, …
- Geo preset (`geo_polygon`, `geo_radius`) — **intersect** with bbox (bbox ∩ geo filter), not replace

---

## Response Shape (Slim DTO)

```typescript
// Blocks viewport row
{
  id: number;
  slug: string;
  name: string;
  lat: number;
  lng: number;
  priceFrom: number | null;
  district: string | null;
  imageUrl: string | null;
}

// Listings viewport row
{
  id: number;
  lat: number;
  lng: number;
  price: string;
  title: string | null;
  photoUrl: string | null;
}

// Envelope
{ data: T[]; meta: { count: number; prototype?: boolean } }
```

Full card/detail data remains on existing endpoints (`/blocks/:slug`, `/listings/:id`).

---

## Clustering Interaction

| Layer | Behavior |
|---|---|
| Server | Returns flat marker list for bbox — **no server clustering** |
| Client | Existing `useMapClusterLayer` + Yandex Clusterer unchanged |
| Zoom | Bbox refetch on meaningful bounds change; cluster mode (dot/price/name) still zoom-driven |
| Density | Dense urban bbox may hit `limit`; meta should expose `truncated: true` in production |

**Open question:** Should `limit` scale with zoom? Proposal: `limit = min(500, 50 + zoom * 20)` — requires measurement before adoption.

---

## Pagination Interaction

Viewport and pagination are **orthogonal**:

| Mode | Pagination |
|---|---|
| Legacy catalog sidebar | `page` / `per_page` on `/blocks` |
| Viewport map | No pages — single bbox response with `limit` |
| Hybrid (future) | Sidebar stays paginated; map uses viewport — **requires sync strategy** (out of scope Iter 8) |

Do not add `page` to viewport endpoint in v1.

---

## Region Interaction

- `region_id` is mandatory — bbox alone is insufficient (cross-region bounds possible at low zoom).
- Region switch → invalidate viewport cache / reset bbox signature.
- `regionCenter` map pan remains client-side; viewport fetch waits for valid bbox (`zoom >= 10`).

---

## Geo Filter Interaction

**Current production:** Geo resolves to block ID set via PostGIS, then Prisma catalog query.

**Proposed viewport composition:**

```
result = blocks WHERE region_id = R
         AND ST_Within(point, envelope(bbox))
         AND id IN (geo_block_ids)   -- when geo_* params present
         AND catalog_filters…
```

**Listings mode:** Geo is block-centric today. Listings viewport should either:

1. Filter listings by lat/lng in bbox directly (prototype approach), OR
2. Join through block IDs when geo preset active

Prototype uses (1) for simplicity; production must reconcile with geo-in-listings-key fix from Iter 5.

---

## Prototype Implementation (Isolated)

| File | Role |
|---|---|
| `viewport-prototype.controller.ts` | `GET _prototype/blocks/viewport`, `…/listings/viewport` |
| `viewport-prototype.service.ts` | PostGIS `ST_Within` + `ST_MakeEnvelope` |
| Gating | `VIEWPORT_PROTOTYPE_ENABLED=1` OR `NODE_ENV !== 'production'` |

**Note:** Running API must be restarted to register prototype routes. Measured 404 on live `:3000` before restart (2026-05-22) — frontend fallback to client-filter activates correctly.

---

## Migration Path (Future, NOT Iter 8)

1. **Phase 0 (now):** Prototype + metrics + RFC
2. **Phase 1:** Production `/blocks/viewport` behind feature flag; legacy path default
3. **Phase 2:** Sidebar pagination independent of map viewport
4. **Phase 3:** Raise or remove 200 cap for map-only via viewport (not global catalog)

---

## RFC Decision

| Decision | Choice |
|---|---|
| Endpoint namespace | Separate `/viewport` routes, not query params on `/blocks` |
| Prototype prefix | `_prototype` until contract frozen |
| Clustering | Client-only (no change) |
| Pagination | Not combined with viewport in v1 |
| Production rollout | **Blocked** until Iter 8 metrics show safe parity |
