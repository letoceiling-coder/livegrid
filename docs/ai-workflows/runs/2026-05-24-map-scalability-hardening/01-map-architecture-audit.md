# Phase 1 — Map Architecture Audit

**Iteration:** 64 · **Date:** 2026-05-24

## Before (production)

| Area | Finding |
|------|---------|
| Data fetch | Global per_page=200 for entire region |
| Viewport | DEV-only /_prototype/*/viewport |
| Clustering | Client Yandex Clusterer on all loaded markers |
| Zoom tiers | Render-only, not fetch tiers |
| Listings API | id-fallback loaded ALL matching IDs |
| Observability | map_debug DEV overlay only |

## Verdict

Audit complete — addressed in Phases 2–7.
