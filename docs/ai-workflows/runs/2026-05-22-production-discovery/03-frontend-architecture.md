# 03 — Frontend Architecture

**App:** `@lg/web` — `apps/web`  
**Build output:** `apps/web/dist` → served at `https://livegrid.ru/`  
**Verified prod bundle:** `/assets/index-DzWwKgn8.js` (2026-05-04)

---

## Stack

| Layer | Choice |
|-------|--------|
| Framework | React 18 |
| Build | Vite 5 + `@vitejs/plugin-react-swc` |
| Router | React Router 6 (lazy routes) |
| Server state | TanStack Query v5 |
| Client state | useState + URL (catalog filters) |
| UI | Tailwind 3 + Radix/shadcn |
| Forms | react-hook-form + zod |
| SEO | `scripts/prerender-seo.mjs` post-build |

---

## Directory Structure

```
apps/web/src/
├── App.tsx                 # Router root
├── redesign/               # ACTIVE public UI
│   ├── pages/              # Index, Catalog, Map, Complex, Apartment, Layouts
│   ├── components/         # MapSearch, FilterSidebar, HeroSearch, etc.
│   ├── hooks/              # useDefaultRegionId, useSiteSettings
│   ├── lib/                # API param builders, URL sync, mappers
│   └── data/               # types.ts, mock-data formatters
├── admin/                  # Embedded admin CRM (/admin/*)
├── pages/                  # Secondary marketing/catalog pages
├── shared/                 # Auth, hooks, components
├── components/             # Home page sections
└── lib/api.ts              # Nest API client (/api/v1)
```

---

## Routing (`App.tsx`)

**Public redesign (lazy):**
- `/` → RedesignIndex
- `/catalog` → RedesignCatalog
- `/complex/:slug` → RedesignComplex
- `/apartment/:id` → RedesignApartment
- `/listing/:id` → RedesignListingDetail
- `/map` → **RedesignMap**
- `/layouts/:complex` → RedesignLayouts

**Admin:** `/admin/*` — dashboard, blocks, listings wizards, feed import, users, media, requests, etc.

**Auth:** `/login`, `/register`, profile, favorites, compare

**No Laravel CRM** (`/crm`, `/crm2`) in Nest web app.

---

## API Layer (`lib/api.ts`)

```typescript
const API_PREFIX = '/api/v1';
// Production: same-origin → nginx → Nest :3000
export function apiUrl(path: string): string { ... }
export async function apiGet<T>(path: string): Promise<T>
```

- JWT bearer from `lg_access_token`
- Credentials include for cookies
- **Explicit comment:** "Базовый клиент к NestJS API"

Dev: Vite proxies `/api` → `localhost:3000`.

---

## State Architecture

| Concern | Pattern |
|---------|---------|
| Server data | React Query with stable queryKeys |
| Catalog/map filters | `CatalogFilters` state + **URL sync** |
| Region | `useDefaultRegionId` + localStorage + URL `region_id` |
| Auth | `useAuth` + token storage |
| Map selection | Local `activeBlock` / `activeListing` state |

---

## URL Sync (`catalog-url-sync.ts`)

**Bidirectional** filter ↔ query string:

- Read: `catalogFiltersFromSearchParams` on mount / URL change
- Write: `catalogFiltersIntoSearchParams` on filter change
- Signature: `catalogFilterUrlSignature` — detects URL filter changes without full remount

Keys include: `type`, `market`, `search`, `rooms`, price/area/floor, `deadline`, `finishing_ids`, `district_names`, `subway_names`, `builder_names`, `status`.

**Map page** uses same sync — shareable filter URLs work on `/map`.

---

## Query Key Patterns (Map Page)

```typescript
['stats', 'listing-kind-counts', regionId]
['blocks', 'deadlines', regionId]
['districts', regionId, districtKind]
['subways', regionId]
['builders', regionId]
['reference', 'finishings']
['blocks', 'map', regionId, filters..., geo...]
['listings', 'map', regionId, objectType, filters...]
```

---

## Redesign vs Legacy

| Layer | Status |
|-------|--------|
| `redesign/` | **Active** — all primary user flows |
| `pages/CatalogApartments` etc. | Secondary/legacy catalog variants |
| `/old/*` | Not primary in Nest App.tsx |

---

## Mobile Patterns

- Map page: bottom list `max-h-[40vh]`, filter overlay sheet
- `RegionSelector` component
- Responsive header with filter button
- Same React Query gates on mobile/desktop

---

## Production vs Local Mirror Drift

| Item | Note |
|------|------|
| Prod bundle date | 2026-05-04 |
| Local git HEAD | 2026-05-22 (`43b5026`) |
| Laravel `frontend/` R2.2b | **Not in this app** — separate repo path |

Nest `RedesignMap.tsx` is **more feature-complete** than Laravel monolith copy:
- Full URL sync
- RegionSelector + region center
- Finishing reference integration
- Secondary market coord fallback
- Inline search suggestions
- `rooms`/`dachas` unsupported type handling

---

## Active Production UI

**What users see on livegrid.ru:**
- Nest `apps/web` SPA from `/assets/*`
- Redesign pages calling Nest `/api/v1/blocks`, `/listings`, `/stats`
- Admin at `/admin` (same SPA)

**What users do NOT see:**
- Laravel `public/build/` bundle
- `useMapPageComplexes` / `map/complexes`
