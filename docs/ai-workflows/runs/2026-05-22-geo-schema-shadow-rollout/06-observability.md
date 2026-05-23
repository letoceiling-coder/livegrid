# Iteration 20.6 — Observability

## Mode

SCHEMA GOVERNANCE · DEV-only · 2026-05-22

---

## Endpoints

### Contract-check (extended)

```
GET /api/v1/_prototype/viewport/contract-check
```

Returns 14 checks including 5 geo resolver + 1 DB shadow sample.

Gated: `VIEWPORT_PROTOTYPE_ENABLED=1` OR `NODE_ENV !== production`

---

### Shadow lineage stats (new)

```
GET /api/v1/geo/_shadow/lineage-stats
```

**DEV-only** — returns 503 in production.

Response shape:

```json
{
  "shadow": true,
  "readOnly": true,
  "regionId": 1,
  "metrics": {
    "sampleSize": 2000,
    "totalActivePublished": 14917,
    "resolverBreakdown": { ... },
    "schemaState": { ... },
    "sqlResolvable": { ... }
  }
}
```

---

## Implementation

| Component | File |
|---|---|
| Metrics collector | `geo-shadow-lineage.service.ts` |
| Controller route | `geo.controller.ts` |
| Resolver debug | `geo-resolver-debug.ts` (`GEO_RESOLVER_DEBUG=1`) |

---

## Performance

| Rule | Status |
|---|---|
| No resolver DB calls in hot path | ✓ resolver pure |
| Shadow stats on-demand only | ✓ explicit GET |
| No map API changes | ✓ |
| No viewport rollout | ✓ |
| Sample capped at 2,000 in probe | ✓ |

Contract-check adds ~1.5s for shadow DB sample (acceptable DEV-only).

---

## Production safety

- `/_shadow/lineage-stats` disabled in production
- Contract-check prototype gate unchanged
- No new production metrics exporters
