# Iteration 30.3 — Consultation Flow

## Mode

LEAD + CONTACT CONVERSION FLOW · consultation UX · 2026-05-22

Component: `ConsultationFlow.tsx`

---

## Architecture

```
User click → ConsultationContext → ConsultationFlow (Dialog/Sheet)
                                         └─ LeadForm (embedded)
                                              └─ POST /requests
                                                   └─ real success UI
```

---

## Required fields

| Field | Source |
|---|---|
| name | User input |
| phone | User input (masked +7) |
| comment | Optional user input |
| type | `requestType` from context (default CONSULTATION) |
| blockId | Context when on complex/map_complex |
| listingId | Context when on apartment/listing/map_listing |
| sourceUrl | `window.location.href` |
| comment payload | source + contextFooter merged |

---

## Context auto-fill examples

| Surface | source | blockId | listingId |
|---|---|---|---|
| Apartment | `apartment:{id}` | ✓ | ✓ |
| Complex | `complex:{slug}` | ✓ | — |
| Map listing | `map:listing:{id}` | — | ✓ |
| Map complex | `map:complex:{slug}` | ✓ | — |
| Home | `home:help-cta` | — | — |

---

## Success state

Real backend success only:
- LeadForm sets `submitted=true` after `POST /requests` resolves
- Shows «Спасибо! Менеджер свяжется в течение 2 часов»
- `onSuccess` closes modal when embedded in ConsultationFlow

No fake success on network failure — error message shown.

---

## Mobile vs desktop

| Viewport | Container |
|---|---|
| ≤639px | Bottom Sheet, `max-h-[90vh]`, `safe-area-pb` |
| >639px | Dialog `sm:max-w-md` |

`prefersReducedMotion()` disables dialog animation.

---

## Inline forms retained

`#lead` sections on apartment/complex pages remain for scroll-depth conversion. Modal provides immediate CTA path without scroll.
