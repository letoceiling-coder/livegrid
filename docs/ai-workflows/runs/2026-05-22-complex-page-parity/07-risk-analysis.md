# Iteration 27.7 — Risk Analysis

## Mode

Complex page parity risks · 2026-05-22

---

## Low risk

| Change | Risk | Mitigation |
|---|---|---|
| Remove Tabs | UX regression for tab lovers | All content now visible — net positive |
| Scroll IA | Long page | Anchor nav + sticky CTA |
| Type group nesting | Deep accordion | Only expand on demand |

---

## Medium risk

| Item | Risk | Mitigation |
|---|---|---|
| 500 listing cap | Chess/table incomplete for huge JK | Documented API limit (existing) |
| Double accordion | UX complexity | Accept for Iter 27; simplify in future |
| Map lazy init | Brief empty map box | Muted placeholder bg |
| Phone button | Non-functional | Pre-existing; unchanged |

---

## Out of scope (correct)

- Viewport / map architecture
- Geo / cluster work
- Backend block API changes
- Server-side room aggregates

---

## Rollback

Revert `RedesignComplex.tsx`, `ComplexHero.tsx`, remove new components — no DB/API dependency.

---

## API gaps documented

- No dedicated developer entity endpoint (name string only)
- Infrastructure from block JSON — may be empty for some feeds
- Building metadata limited to name/queue/deadline from API
