# Iteration 26.5 — Network Storm Analysis

## Mode

Bbox request dedupe, cancel, and churn validation · 2026-05-22

---

## Existing guards

| Guard | Value | Location |
|---|---|---|
| Bbox debounce | 450 ms | `VIEWPORT_BBOX_DEBOUNCE_MS` |
| Epsilon filter | 0.0008° | `bboxChangedMeaningfully` |
| Sig dedupe | bbox+filter signature | `useViewportListingsExperimental` |
| Min zoom | 10 | `VIEWPORT_MIN_ZOOM` |

---

## Iter 26 additions

| Counter | Trigger |
|---|---|
| `bbox deduped` | Same sig or epsilon skip |
| `bbox canceled` | AbortController on superseded fetch |
| `viewport stale dropped` | Response after newer request started |
| `sig churn` | Distinct bbox signature changes |
| `bbox req/min` | Rolling 60s window |

---

## Thresholds

| Level | Requests/min | Interpretation |
|---|---:|---|
| **GREEN** | ≤ 20 | Healthy |
| **YELLOW** | 21–60 | Aggressive panning |
| **RED** | > 60 | Storm — investigate debounce |

---

## Scenarios

### B — Pan storm
30s rapid pan → expect:
- High `deduped` (epsilon + debounce working)
- Low `req/min` relative to pan events
- Some `canceled` during fast pan (abort working)

### E — Filter spam
Rapid filter toggles → expect:
- `sig churn` increments per distinct filter state
- `stale dropped` if fetches overlap
- Map shows last completed state (no broken state)

---

## API latency baseline (Iter 24)

Moscow wide viewport fetch: **~214 ms** (server-side, not browser render).

Network storm does **not** affect cluster rebuild directly unless response triggers new marker set.

---

## Manual checklist

- [ ] Pan storm: deduped >> req/min
- [ ] Pan storm: req/min stays GREEN or YELLOW
- [ ] Filter spam: no permanent loading state
- [ ] Filter spam: stale dropped counted correctly
