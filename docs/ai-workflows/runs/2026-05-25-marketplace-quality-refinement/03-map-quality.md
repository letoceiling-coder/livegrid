# 03 — Map UX Quality

**Iteration:** 74 · **Date:** 2026-05-25

## Improvements

| Area | Change |
|------|--------|
| Loading perception | `MapSearch` overlay — spinner + "Загрузка карты…" until Yandex Maps ready |
| Selected marker | Existing `activeSlug` pan + bottom sheet — unchanged |
| Cluster click | `clusterOpenBalloonOnClick: false` — existing |
| Mobile | Compact map height `calc(100vh-220px)`, touch-friendly popup actions |
| Empty state | "Нет объектов с координатами" + switch to grid — existing |

## No rewrite

Viewport production strategy, cluster layer, shadow render flags — all preserved.

## Verdict

**Loading perception improved**; core map architecture untouched.
