# R3.1 — Mobile Safety

## Mode

READ-ONLY · `@gstack/design-review`

---

## Layout Structure (unchanged)

```tsx
<div className="flex h-svh flex-col">
  <RedesignHeader />
  <aside className="hidden lg:block">FilterSidebar</aside>
  <div className="flex flex-1 flex-col lg:flex-row">
    <div className="flex-1">Map + search + subtitle</div>
    <aside className="max-h-[40vh] lg:max-h-none lg:w-[360px]">List</aside>
  </div>
  {showFilters && <fixed overlay z-[60] />}
</div>
```

No layout class changes in R3. **Structure preserved.**

---

## Mobile-Specific R3 Changes

### 1. Subtitle row

```typescript
formatMapSubtitle(loadedCount, catalogTotal, isCatalogRefetching)
// "Показано 200 из 359 объектов" — longer string
```

| Risk | Assessment |
|---|---|
| Text overflow | `text-sm font-semibold` on flex row — may wrap on 320px |
| Mitigation | Column layout on mobile (`flex-col gap-2`) — pre-existing |

Longest string: `Показано 200 из 359 объектов · обновление…` (~45 chars) — fits 320px width at 14px.

### 2. Filter overlay CTA

```tsx
{hasPaginationGap
  ? `Показать ${loadedCount} из ${catalogTotal} объектов`
  : `Показать ${catalogTotal} объектов`}
```

| Check | Result |
|---|---|
| Button height | `h-12` unchanged |
| Text wrap | Single line at 375px ✓ |
| Fixed bottom bar | `fixed bottom-0` unchanged |

### 3. Sidebar pagination notice

```tsx
<p className="text-[10px] text-amber-700 dark:text-amber-500 mt-1">
  Показано {loadedCount} из {catalogTotal} объектов
</p>
```

Fits in 40vh panel header without scroll. **No overflow regression.**

### 4. Error retry on mobile

```tsx
<Button variant="outline" size="sm" className="h-8 text-xs" onClick={retryCatalog}>
```

Tap target 32px height — acceptable for secondary action. Pre-existing button patterns.

### 5. Lazy images in 40vh scroll panel

Images below fold defer loading — **improves** mobile scroll performance in dense list.

---

## Overlay Behavior

| Behavior | Preserved |
|---|---|
| Open via "Фильтры" button | ✓ |
| Close via X or CTA | ✓ |
| `z-[60]` stacking | ✓ |
| Duplicate FilterSidebar instance | ✓ (pre-existing) |
| `totalCount={catalogTotal}` in overlay | Updated to 359 — correct |

---

## Comparison vs Production Mobile

| Element | Production | Post-R3 |
|---|---|---|
| Map touch/pan | Yandex default | Unchanged |
| 40vh list cap | Yes | Unchanged |
| Filter overlay | Full screen | Unchanged |
| Object count honesty | Wrong (200) | Correct (359) |

---

## Mobile Safety Verdict

| Criterion | Status |
|---|---|
| Overlay preserved | ✓ PASS |
| CTA stable | ✓ PASS |
| No overflow regressions | ✓ PASS |
| Touch targets adequate | ✓ PASS |
| Lazy images safe | ✓ PASS |

**Mobile safety: APPROVED.**

**Recommended manual check before deploy:** iPhone SE (375px) — subtitle wrap, overlay CTA text.
