# Iter 38 — Attribution Domain Model

## Source of Truth

`packages/shared/src/crm/request-attribution.ts`

---

## Source Types

| Type | Detection |
|---|---|
| `MAP_POPUP` | pathname `/map` |
| `CATALOG_CARD` | `/catalog` |
| `COMPLEX_PAGE` | `/complex/`, `/layouts/` |
| `APARTMENT_PAGE` | `/apartment/` |
| `LISTING_PAGE` | `/listing/` |
| `HOME_PAGE` | `/` |
| `CONTACTS` | `/contacts` |
| `SELECTION` | `/selection` |
| `TELEGRAM` | `telegramSent` or `telegram-bot:` URL |
| `DIRECT` | No URL, no object ids |
| `UNKNOWN` | Unparseable / other paths |

---

## Derived Fields

```typescript
{
  sourceType: AttributionSourceType;
  label: string;              // RU label
  conversionSurface: string;  // e.g. map_popup, catalog
  landingPath: string | null; // pathname only
}
```

---

## Design Rules

- **No UTM warehouse** — pathname + object linkage only
- **No persisted attribution column** — derived at read time
- **Comment tag** not used for classification (future enhancement)
- Safe for Node + browser (no `URL` global dependency)

---

## Quality Signals

Rule-based hints via `analyzeAttributionHints()` — not ML scores.
