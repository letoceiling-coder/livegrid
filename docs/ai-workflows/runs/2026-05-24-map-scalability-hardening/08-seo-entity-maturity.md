# Phase 8 — SEO Entity Maturity

**Iteration:** 64

## Implemented

- `useEntitySeoMeta` hook — dynamic title, description, canonical, OG/Twitter image
- **RedesignComplex** — Residence JSON-LD + block name/price/district
- **RedesignApartment** — Apartment JSON-LD + Offer + floorSize

## Strategy

- OG image: entity photo → fallback `/og-default.jpg`
- No SSR rewrite — client `useEffect` only

## Gaps

- Dynamic OG image generation service (CDN) — deferred
