# R3 — Mobile Verification

## Mobile Layout (unchanged architecture)

| Element | Classes | R3 impact |
|---|---|---|
| Filter button | `lg:hidden` | opens overlay |
| Map | `flex-1` | unchanged |
| Sidebar list | `max-h-[40vh]` | pagination notice added |
| Filter overlay | fixed full screen | catalogTotal in CTA |

---

## R3 Mobile-Specific Changes

### Filter overlay CTA

**Before:**

```
Показать 200 объектов   ← wrong (loaded count)
```

**After (with pagination gap):**

```
Показать 200 из 359 объектов
```

**After (no gap):**

```
Показать 42 объектов
```

Uses `catalogTotal` from `meta.total`, not `blocks.length`.

### Subtitle (mobile header row)

Same `formatMapSubtitle` as desktop:

```
Показано 200 из 359 объектов
```

On refetch:

```
Показано 200 из 359 объектов · обновление…
```

### Sidebar pagination notice

Amber text under list header — visible in 40vh panel without scrolling:

```
Показано 200 из 359 объектов
```

### Error state

Retry button accessible in mobile sidebar panel — `Button size="sm"` tap target.

### Lazy loading

200 sidebar images defer load — reduces initial mobile bandwidth when list scrolls into view.

---

## Verification Checklist (375px viewport)

| # | Action | Expected |
|---|---|---|
| 1 | Open `/map?region_id=1` | Subtitle: "Показано 200 из 359 объектов" |
| 2 | Tap "Фильтры" | FilterSidebar shows total 359 in filter count area |
| 3 | Close overlay | CTA: "Показать 200 из 359 объектов" |
| 4 | Change filter (slow network) | List stays visible during refetch |
| 5 | Stop API, reload | Retry button in bottom panel |
| 6 | Switch to Дома | Listings total from meta (if >200, pagination notice) |
| 7 | Scroll sidebar | Images load on demand (lazy) |

---

## DevTools Mobile Emulation

```
Chrome → Toggle device toolbar → iPhone SE (375×667)
http://localhost:5173/map?region_id=1
```

---

## Not Changed

- 40vh sidebar height cap
- Full-screen filter overlay pattern
- Map touch / Yandex controls
- No mobile-specific pagination UI (scroll still limited to 200 items)
