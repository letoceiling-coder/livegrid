# 09 — Production Risks

**Iteration:** 72 · **Date:** 2026-05-24

## P1 — Remaining

| Risk | Mitigation |
|------|------------|
| **Dual BullMQ repeat keys** | Monitor Monday import; dedupe Redis repeat if duplicate |
| **Web/admin SPA lag** | Deploy web build when ready for UI observability |
| **listings.service patch drift** | Apply patch from git on deploy until schema migration |
| **Sitemap regen on deploy** | Post-import hook + manual trigger documented |

## P2 — Low

| Risk | Notes |
|------|-------|
| 11 orphan apartments | integrity health reports; non-blocking |
| 8,127 SOLD | Expected off-feed |
| Static sitemap.xml coexistence | Harmless; robots points to index |

## Resolved (iter 72)

- Hotpatch drift ✅
- Recovery API 404 ✅
- Sitemap index 404 ✅
- LISTINGS_EXPIRE FEED bug ✅

## Verdict

**Low residual risk.** Platform is operationally governed.
