# R3 — Error States

## Problem (audit finding)

API failures were indistinguishable from empty catalog:

```typescript
blocks.length === 0 ? "Нет объектов по фильтрам." : ...
// No blocksQuery.isError handling
```

User sees misleading empty state on network/server errors.

---

## Fix

### Error detection

```typescript
const catalogFetchError = displayBlocks
  ? blocksQuery.error
  : listingsActive
    ? listingsQuery.error
    : null;
```

Active query selected by display mode:

| Mode | Error source |
|---|---|
| Blocks map (apartments primary) | `blocksQuery.error` |
| Listings map (houses, secondary, etc.) | `listingsQuery.error` |

### Subtitle on error

```
Не удалось загрузить объекты
```

### Sidebar UI

```
┌─────────────────────────────────────┐
│ ⚠ Не удалось загрузить объекты.     │
│   Проверьте соединение и попробуйте │
│   снова.                            │
│ [ Повторить ]                       │
└─────────────────────────────────────┘
```

Components: `AlertCircle` icon + `Button variant="outline"` → `retryCatalog()`.

```typescript
const retryCatalog = () => {
  if (displayBlocks) void blocksQuery.refetch();
  else void listingsQuery.refetch();
};
```

---

## Behavior Matrix

| Condition | Sidebar | Subtitle | Map |
|---|---|---|---|
| Initial loading | "Загрузка…" | "Загрузка…" | empty or previous |
| Error | retry UI | error text | previous via keepPreviousData |
| Empty (success) | "Нет объектов по фильтрам." | `0 объектов на карте` | empty |
| Success | list | pagination subtitle | markers |

---

## Map on Error

Map is **not** hidden on error. If previous data exists (keepPreviousData), markers remain. If first load fails, map area empty — acceptable; sidebar shows retry.

---

## Verification

### Simulate API failure

```bash
# Stop API
pkill -f "node apps/api/dist/main.js"

# Open http://localhost:5173/map
# Expect: sidebar retry UI, subtitle error text

# Restart API and click "Повторить"
~/livegrid/scripts/local-dev-api.sh  # or node dist/main.js
```

### Invalid region (optional)

```
/map?region_id=999999
```

May return empty (valid) or error depending on API — distinguish by `isError` vs empty data.

---

## Not in Scope

- Toast notifications
- Error boundary at route level
- Distinct messages per HTTP status code
- Sentry / logging integration
