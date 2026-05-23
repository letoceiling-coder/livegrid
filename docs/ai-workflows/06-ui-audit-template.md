# LiveGrid — UI / UX Audit Template

**Task ID:**  
**Date:**  
**Reviewer:**  
**Status:** pass | pass-with-notes | fail

**Environment:** `https://dev.livegrid.ru` | `https://livegrid.ru` | local

**Prerequisite:** Implementation deployed or available on target env

---

## 1. Scope

Pages / flows tested:

| Route | Component | Priority |
|-------|-------------|----------|
| `/` | HomeNew | |
| `/catalog` | RedesignCatalog | |
| `/map` | RedesignMap | |
| `/complex/:slug` | RedesignComplex | |
| `/apartment/:id` | RedesignApartment | |
| `/crm/*` | CRM | |
| Other: | | |

---

## 2. Breakpoints

Test at:

- [ ] 360px (mobile)
- [ ] 768px (tablet)
- [ ] 1280px+ (desktop)

---

## 3. Functional UX

| Flow | Works? | Notes |
|------|--------|-------|
| Hero search → catalog/map | | |
| Catalog filters + URL share | | |
| Catalog pagination / load more | | |
| Map markers + list sync | | |
| Complex tabs (apartments, chessboard, layouts) | | |
| Apartment detail + lead form | | |
| Favorites (if implemented) | | |
| Login / register (if in scope) | | |

---

## 4. States

| State | Page | OK? | Issue |
|-------|------|-----|-------|
| Loading | | | |
| Empty | | | |
| Error / API fail | | | |
| Partial data | | | |

---

## 5. Visual / Design Consistency

| Check | OK? | Notes |
|-------|-----|-------|
| Tailwind / shadcn spacing consistent | | |
| Typography hierarchy | | |
| No horizontal scroll on mobile | | |
| Touch targets ≥ 44px where required | | |
| Header / footer consistent (`AppLayout`) | | |
| No double header (e.g. `/map`) | | |
| Images / placeholders | | |

---

## 6. Map-Specific

| Check | OK? | Notes |
|-------|-----|-------|
| Map loads (Yandex script) | | |
| API errors handled (NestJS vs Laravel mismatch?) | | |
| Filters on map match catalog semantics | | |
| Marker click / highlight | | |
| Mobile map + filter drawer | | |

---

## 7. Filter / URL State

| Check | OK? | Notes |
|-------|-----|-------|
| Query string reflects filters | | |
| Reload preserves state | | |
| Param names match backend (`priceMin` vs `price_min`) | | |

---

## 8. CRM UI (if in scope)

| Screen | OK? | Notes |
|--------|-----|-------|
| Login | | |
| Dashboard | | |
| Complexes / apartments forms | | |
| Requests | | |
| Feed page | | |

---

## 9. Accessibility (basic)

| Check | OK? | Notes |
|-------|-----|-------|
| Focus visible on interactive elements | | |
| Form labels / errors readable | | |
| Contrast acceptable on primary CTAs | | |

---

## 10. Findings

| ID | Severity | Page | Issue | Screenshot ref | Fix owner |
|----|----------|------|-------|----------------|-----------|
| U-01 | blocker / major / minor | | | | |

**Blockers:**

---

## 11. SEO / Meta (if in scope)

| Check | OK? | Notes |
|-------|-----|-------|
| Per-route title/description | | |
| Static `index.html` only | | |

---

## 12. Verdict

- [ ] **Pass**
- [ ] **Pass with minor polish backlog**
- [ ] **Fail** — block release for UX blockers

---

## 13. gstack

- [ ] `gstack-design-review` (fix loop if allowed)
- [ ] `gstack-qa` or `gstack-qa-only` on staging URL

---

## 14. Sign-off

| UX reviewer | Date |
