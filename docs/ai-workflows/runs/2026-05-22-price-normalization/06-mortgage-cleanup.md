# Iteration 3 — Mortgage Cleanup

## Scope

Minimal normalization for catalog list mortgage display. Full mortgage calculator (`Mortgage.tsx`) unchanged — out of redesign scope.

---

## New Helper

```typescript
export function formatMortgageLabel(value: string | null | undefined): string {
  const t = value?.trim();
  if (!t || t === '—' || /^undefined/i.test(t)) return MORTGAGE_UNAVAILABLE;
  return t;
}
```

`MORTGAGE_UNAVAILABLE` = **«Ипотека недоступна»**

---

## Updated

| File | Change |
|---|---|
| `components/catalog/CatalogList.tsx` | `formatMortgageLabel(data.mortgage)` |

---

## Behavior

| Input | Output |
|---|---|
| `"Ипотека от 4.5%"` | `"Ипотека от 4.5%"` |
| `null` / `""` | `"Ипотека недоступна"` |
| `"—"` | `"Ипотека недоступна"` |
| `"undefined"` | `"Ипотека недоступна"` |

---

## Not Updated (legacy / mock)

- `pages/Catalog.tsx` mock mortgage strings — static demo data
- `pages/Mortgage.tsx` calculator — functional tool with real numbers
- `pages/ZhkDetail.tsx` — legacy Laravel-era page

Future iteration can wire API mortgage fields through same helper.

---

## Installments / Subsidy

No API fields for installments in redesign path. When present in `PropertyData.mortgage`, `formatMortgageLabel` passes through valid strings unchanged.
