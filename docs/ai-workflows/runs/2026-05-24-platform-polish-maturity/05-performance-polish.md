# 05 — Performance Polish

**Iteration:** 73 · **Date:** 2026-05-24

## Optimizations (no architecture rewrites)

| Change | Impact |
|--------|--------|
| Smart progress polling | Eliminates idle 3s `/progress` polls when import idle |
| Governance nav filter | Smaller admin bundle routes tree at runtime |
| Lazy admin routes | Unchanged — existing code-splitting |

## Measured (production)

| Endpoint | Latency |
|----------|--------:|
| catalog-counts (local prod) | ~3 ms |
| Public /catalog | ~200–400 ms |
| Public /map | ~300–500 ms |
| Admin diagnostics compute | **110 ms** |

## Not changed

- React Query global defaults
- Map cluster algorithm
- Catalog infinite scroll batch size

## Verdict

**Polling waste reduced.** No heavy list virtualization added (not required at current admin page sizes).
