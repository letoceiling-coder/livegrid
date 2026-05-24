# 02 — Filter UX Maturity

**Iteration:** 74 · **Date:** 2026-05-25

## Improvements

| Feature | Detail |
|---------|--------|
| **Fast presets** | `CatalogFilterPresets` — Студии до 8 млн, 2-к до 15 млн, 3-к от 60 м², Новостройки, Сданные |
| **Active chips** | Extended `CatalogActiveFilterChips` — floor, deadline, finishing |
| **Reset UX** | Empty state "Сбросить фильтры" button |
| **Mobile filters** | Safe-area bottom bar (iter 73) + preset horizontal scroll |
| **Conflicting filters** | Presets toggle off when re-clicked |

## Preset behavior

Presets apply partial `CatalogFilters` patch preserving `objectType` and current search. Hidden when not apartments/rooms mode.

## FilterSidebar

Existing collapsible sections, searchable district/metro lists, active tag strip — unchanged architecture.

## Verdict

**Faster apartment discovery** via one-tap presets and richer active filter visibility.
