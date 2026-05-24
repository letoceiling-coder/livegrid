# Phase 9 — QA Matrix

| Scenario | Auto | Manual |
|----------|------|--------|
| map-viewport-strategy tests | ✅ | |
| API typecheck | ✅ | |
| Web runtime typecheck | ✅ | |
| 60 min map session | | ☐ |
| Mobile map pan/zoom | | ☐ |
| Viewport spam (rapid pan) | | ☐ |
| Filter switch during pan | | ☐ |
| Feed refresh + map | | ☐ |
| Admin + map simultaneous | | ☐ |
| `VITE_MAP_VIEWPORT=0` fallback | | ☐ |
| Complex/apartment SEO tags | | ☐ |

## Commands

```bash
pnpm --filter @lg/api typecheck
pnpm --filter @lg/web typecheck:runtime
pnpm --filter @lg/web test -- src/redesign/lib/map-viewport-strategy.test.ts
```
