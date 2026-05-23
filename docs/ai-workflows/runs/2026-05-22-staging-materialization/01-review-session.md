# Iteration 23.1 — Belgorod Review Session

## Mode

CONTROLLED STAGING · review completion · 2026-05-22

---

## Session execution

```bash
pnpm --filter api geo:belgorod-review iter23-belgorod-session
```

---

## Before session

| Metric | Count |
|---|---:|
| Pending review | 55 |
| Approved exact | 1 (Iter 22 test) |
| Shadow unclassified | 56 |

---

## Session result

| Metric | Count |
|---|---:|
| Recorded | **55** |
| Skipped | 1 (already approved) |
| Errors | **0** |

---

## After session

| Metric | Count |
|---|---:|
| Pending review | **0** |
| Approved exact | **56** |
| Approved inherit | 0 |
| Invalid | 0 |
| Unresolved | **0** |

**All 56 Belgorod legacy rows have final review decisions.**

---

## Decision breakdown

| Status | Count | Rationale |
|---|---:|---|
| APPROVED_AS_EXACT | 56 | Manual houses/land — preserve stored coords |

All rows:

- region_id = 7 (Belgorod)
- No block_id / building_id
- Resolver suggests MANUAL_EXACT
- No inherit FK available

---

## CSV export

`GET /api/v1/geo/_shadow/legacy-review/export` returns human-readable CSV:

```
listing_id,region_id,lat,lng,address,slug,proposed_source,proposed_quality,...
109902,7,50.70754,36.574826,"с. Шопино...",listing-109902,MANUAL_EXACT,EXACT,...,APPROVED_AS_EXACT
```

---

## Listing geo unchanged

Review decisions stored in `listing_geo_review_decisions` only. Belgorod listing rows retain legacy coords without geo_source (materialization deferred to future EXACT pass).

---

## Governance gate cleared

Belgorod blocker resolved for MSK inherit materialization scope.
