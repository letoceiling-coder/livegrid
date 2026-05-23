# Iteration 26.2 — Cluster Performance Analysis

## Mode

Cluster rebuild measurement framework · 2026-05-22

---

## What is measured

| Metric | Source | Overlay field |
|---|---|---|
| Last rebuild | `performance.now()` in cluster effect | `last rebuild` |
| Rebuild avg | Rolling 120 samples | `rebuild avg` |
| Rebuild p95 | Rolling percentile | `rebuild p95` |
| Rebuild max | Session max | `rebuild max` |
| Placemark count | `descriptors.length` | `placemarks` |
| Cluster objects | Always 1 Clusterer | `clusters: 1` |
| Icon swaps | Selection updates × icons changed | `icon swaps` |

---

## Thresholds

| Level | p95 rebuild | Interpretation |
|---|---:|---|
| **GREEN** | ≤ 500 ms | Acceptable for staging discussion |
| **YELLOW** | 501–2000 ms | Survivable with UX caution |
| **RED** | > 2000 ms | Block staging until optimization |

Overlay colors p95 using these thresholds.

---

## Scenario A — Moscow wide (6,533 markers)

**Procedure:**
1. Open `/map?region_id=1&viewport_listings=1&map_debug=1`
2. Wait for viewport fetch (`placemarks: ~6533`)
3. Record `rebuild p95` and `rebuild max`
4. Zoom 10 → 15 → 10 repeatedly (10 cycles)
5. Record rebuild count increment

**Expected (code analysis):**
- Initial viewport switch: **1 large rebuild** (~6533 placemarks)
- Zoom bucket change (dot/name/price): **+1 rebuild per mode transition**
- Selection only: **0 rebuilds**, icon swaps only

**Measure in browser:** fill p95/max from overlay after Scenario A.

---

## Scenario — Zoom storm

Rapid zoom in/out without pan:
- Triggers `boundschange` → mode transitions
- Each mode bucket change alters `layerSignature` → full rebuild

**Risk:** ARCHITECTURAL LIMIT — Yandex full rebuild per mode bucket, not incremental.

---

## Before/after abort optimization

| Counter | Pan storm without abort | With abort (Iter 26) |
|---|---|---|
| `bbox canceled` | N/A | Should increment during rapid pan |
| `viewport stale dropped` | Possible duplicate apply | Should increment instead |
| Cluster rebuilds from stale data | Possible extra | Reduced |

Record counters during Scenario B pan storm.

---

## Manual checklist

- [ ] Moscow wide initial rebuild p95 recorded
- [ ] Zoom 10→15 storm rebuild count recorded
- [ ] Icon swap latency < 5ms (selection propagate)
- [ ] No empty map state during rebuild
