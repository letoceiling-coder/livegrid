# Iter 40 — Source + Object Quality

## Source Quality Attribution

Reuses `classifyRequestAttribution()` from Iter 38, extended with outcome classes per source.

| Field | Meaning |
|---|---|
| `strongSuccess` | strong + healthy lifecycle count |
| `unstableSuccess` | reopen-after-success count |
| `fastSpam` | spam within 24h |
| `qualityScore` | weighted operational score |

Sources sorted by lowest quality score first — surfaces weak channels (e.g. map popup with high reopen).

---

## Object Quality (Phase 5 scope)

Object-level quality correlation deferred to object pressure cross-reference:

- Iter 38 `objectPressure` still shows volume/friction pressure
- Iter 40 adds **source-level** quality; object quality inferred via block/listing attribution on same request row

Future: dedicated `OBJECT_QUALITY` snapshot kind when object sample density warrants it.

---

## Business Questions Answered

| Question | Where |
|---|---|
| Map leads: high reopen? | sourceQuality MAP_POPUP row |
| Apartment page: better stability? | compare LISTING_PAGE vs MAP qualityScore |
| Certain ЖК: fake activity? | cross-ref objectPressure + fakeProgressionPct trend |
| High-friction sources | sourceQuality + attribution bottlenecks |
