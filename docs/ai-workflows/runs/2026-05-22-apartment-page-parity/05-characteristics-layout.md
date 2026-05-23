# Iteration 28.5 — Characteristics Block

## Mode

APARTMENT PAGE PRODUCT PARITY · specs · 2026-05-22

---

## Component: `ApartmentCharacteristics`

### Tier 1 — Primary cards (grid)

| Icon | Field |
|---|---|
| Layers | Комнатность |
| Ruler | Общая площадь |
| ChefHat | Кухня (if > 0) |
| Building2 | Этаж X из Y (if floor > 0) |
| Paintbrush | Отделка |

Grid: `2 cols mobile → 3 sm → 5 lg`

---

### Tier 2 — Object table

| Row | Source |
|---|---|
| Корпус | `building.name` |
| Секция | `apartment.section` (if > 0) |
| Номер | `apartment.number` |
| Срок сдачи | `building.deadline` |
| Застройщик | `complex.builder` |

Rows with empty/`—`/`undefined` values omitted via `clean()`.

---

### Tier 3 — Location table

| Row | Source |
|---|---|
| ЖК | Link to `/complex/:slug` |
| Адрес | `complex.address` |
| Район | `complex.district` |
| Метро | `subway · distance` |

---

## Missing fields (no fake data)

| Field | Reason |
|---|---|
| Потолки | Not in Apartment type |
| Балкон / лоджия | Not mapped from API |
| Вид из окна | Not in model |

---

## Visual grouping

```
[ Card ] [ Card ] [ Card ] [ Card ] [ Card ]
┌─ Объект ─────────┐  ┌─ Расположение ───┐
│ key-value rows   │  │ key-value rows   │
└──────────────────┘  └──────────────────┘
```

Section id: `#characteristics` with `scroll-mt-32` for anchor offset.
