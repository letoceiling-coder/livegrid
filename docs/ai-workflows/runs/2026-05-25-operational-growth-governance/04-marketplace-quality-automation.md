# 04 — Marketplace Quality Automation

**Iteration:** 76 · **Date:** 2026-05-25

## Diagnostics surfaced in admin

| Metric | Source |
|--------|--------|
| Catalog eligible | data-quality audit |
| Orphan apartments / blocks | data-quality |
| Duplicate external_id / slugs | data-quality |
| Invalid coordinates | data-quality |
| Apartments without plan | data-quality |
| Blocks without images | data-quality |
| Parity % | per-region health + data-quality |

## Iter 76 UI

Expanded **Public catalog data quality** card in Admin Feed Import (8 metrics).

## API

`GET /admin/feed-import/recovery/data-quality?region=msk` — unchanged, fully consumed in UI.

## Verdict

**Continuous marketplace QC** — existing audit fully visible to operators.
