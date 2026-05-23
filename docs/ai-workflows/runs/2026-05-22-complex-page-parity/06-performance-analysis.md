# Iteration 27.6 — Performance Analysis

## Mode

Complex page performance · no premature rewrites · 2026-05-22

---

## Optimizations applied

| Technique | Where |
|---|---|
| Lazy map init | IntersectionObserver on `#map` |
| Lazy similar card images | `loading="lazy"` |
| Stable gallery frame | `StableMediaFrame` — no layout shift |
| Memoized groups | `useMemo` on apartments, layouts, nav |
| Single building chess | Renders one building vs all |
| Conditional sections | Omit empty blocks from DOM |

---

## Controlled rerenders

- `activeBuildingId` — chess only
- `openKeys` in type groups — local state
- No global context changes on scroll

---

## Not changed (intentional)

- Full apartment list in DOM when group expanded (≤500 listings cap)
- Yandex map script already app-wide via `useYandexMapsReady`
- ApartmentTable plan hover preview (desktop)

---

## CLS risks

| Area | Mitigation |
|---|---|
| Gallery | Fixed aspect ratio container |
| Map | `min-h-[240px]` reserved |
| Hero meta | No async layout shift |

---

## Verification

`pnpm --filter web exec tsc --noEmit` ✓

Manual: no visible flash between loading → hero render.
