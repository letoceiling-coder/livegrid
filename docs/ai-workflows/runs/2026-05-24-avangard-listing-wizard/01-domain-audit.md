# 01 — Domain Audit (Iter 49)

**Date:** 2026-05-24  
**Scope:** Manual listing wizard vs Avangard31-style requirements

## Existing foundation (pre-Iter 49)

| Layer | Status |
|-------|--------|
| Ownership lifecycle | `ListingVisibility`, `ownerUserId`, governance service |
| Manual CRUD API | 5 kinds: APARTMENT, HOUSE, LAND, COMMERCIAL, PARKING |
| Agent cabinet | `/admin/my-listings` |
| Wizard stub | 5-step create-only, localStorage draft v1 |
| Per-kind forms | `AdminManual*` pages with richer house fields |
| Media | Mediateka + `MediaPickerDialog` (editor-only RBAC) |
| Geo | Manual lat/lng in wizard; public `ymaps.geocode` only |

## Gap vs Avangard-style workflow

| Requirement | Before | After Iter 49 |
|-------------|--------|---------------|
| 6 UI types (apt/room/house/dacha/land/commercial) | 5 API kinds only | ROOM/DACHA as UI kinds → APARTMENT/HOUSE |
| Yandex geocoder in admin | Missing | `AddressGeocoderField` |
| Schema-driven forms | Duplicated per page | `@lg/shared` field registry |
| Responsible agent step | Missing | Step 4 with RBAC |
| Lifecycle publish/draft/archive | Legacy status checkbox | Lifecycle API on submit |
| Agent media upload | 403 for agents | Media list/upload opened to agent/manager |
| Preview = real card | Text review | `ListingCard` preview |
| Mobile 360px | Partial | Sticky footer, min-h-11 controls |
| Edit/resume wizard | Missing route | Route added; localStorage v2 |

## Intentionally unchanged (safe additive)

- Prisma schema — no migration
- Feed listings / CRM / map viewport
- Existing manual edit pages (`AdminManual*`)
- Ownership assert logic in governance service

## Iter 13 note

Iteration 13 in repo = sidebar virtualization (map perf), not listing wizard. Avangard references live in house Prisma fields + donor seed scripts.
