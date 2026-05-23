# Iteration 27.1 — Current Gap Audit

## Mode

COMPLEX PAGE PRODUCT PARITY · gap analysis · 2026-05-22

Reference: PROJECT_PLAN C.10 `/complex/:slug`, FINAL_TZ portal quality target.

---

## Before (pre-Iter 27)

| Area | State | Gap |
|---|---|---|
| Layout | Tab panels (`TabsContent`) — **one section visible** | Critical content hidden |
| IA order | Arbitrary tab order | Not sequential scroll |
| Gallery | Overlay text on image | Weak hierarchy vs TrendAgent |
| Apartment groups | Flat room filter pills + table | No Studios/1k/2k/3k/4k+ accordions |
| Building selector | All buildings in chess tab | No dedicated building step |
| Developer | Inside "About" meta grid | No dedicated block |
| Lead form | Sidebar only (desktop) | Not in scroll flow |
| Anchor nav | Pills + tabs duplicated | Tabs hid content |
| Mobile CTA | None fixed | Sidebar hidden on mobile |
| Empty states | Partial | Missing infra/developer empty handling |

---

## After (Iter 27)

| # | Section | Status |
|---|---|---|
| 1 | Gallery | ✓ `ComplexHero` — StableMediaFrame, carousel |
| 2 | Header meta | ✓ Below gallery, not overlay |
| 3 | Building tabs | ✓ `#buildings` — select active corpus |
| 4 | Apartment type groups | ✓ `ApartmentTypeGroups` — expandable |
| 5 | Chessboard | ✓ Single active building |
| 6 | Description | ✓ `#description` — always in DOM |
| 7 | Infrastructure | ✓ `#infrastructure` |
| 8 | Map | ✓ Lazy init on scroll |
| 9 | Developer | ✓ `#developer` dedicated |
| 10 | Lead form | ✓ `#lead` inline + summary |
| 11 | Similar | ✓ `#similar` |

---

## Gap matrix (remaining)

| Item | Severity | Notes |
|---|---|---|
| Apartment table nested in type groups | Low | Double accordion (type → building) |
| Builder logo / CRM link | Medium | API has name only |
| Phone CTA | Medium | Placeholder button (no telephony) |
| Presentation deep-link in nav | Low | Available via header icons |
| Full TrendAgent chess parity | Medium | See 04-chessboard-audit |

---

## Files touched

| File | Change |
|---|---|
| `RedesignComplex.tsx` | Continuous scroll, removed Tabs |
| `ComplexHero.tsx` | Gallery + meta split |
| `ApartmentTypeGroups.tsx` | New |
| `ComplexAnchorNav.tsx` | New |
| `complex-room-groups.ts` | New |
