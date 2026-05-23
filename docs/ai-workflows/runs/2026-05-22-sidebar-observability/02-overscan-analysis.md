# Iteration 14.2 — Overscan Analysis

## Method

Structural formula — same as Iter 13. Compare overscan values without changing **production default (8)**.

```
renderedRows ≈ visibleRows + 2 × overscan
visibleRows  = ceil(viewportHeight / 76)
```

---

## Scenarios (200 total rows)

### Mobile 40vh (~340px viewport)

| overscan | visible | rendered (est.) | DOM reduction |
|---|---|---|---|
| **4** | 5 | **13** | 93.5% |
| **8** (default) | 5 | **21** | 89.5% |
| **12** | 5 | **29** | 85.5% |

### Desktop sidebar (~650px)

| overscan | visible | rendered (est.) | DOM reduction |
|---|---|---|---|
| **4** | 9 | **17** | 91.5% |
| **8** | 9 | **25** | 87.5% |
| **12** | 9 | **33** | 83.5% |

---

## Tradeoffs

| overscan | Scroll smoothness | DOM cost | Rerender on fast fling |
|---|---|---|---|
| 4 | Risk blank flash on fast fling | Lowest | Fewer row mounts |
| 8 | Balanced (current) | Medium | Moderate |
| 12 | Smoothest fast scroll | Highest | More memo row churn |

---

## DEV testing

```
/map?region_id=1&map_debug=1&sidebar_overscan=4
/map?region_id=1&map_debug=1&sidebar_overscan=12
```

Overlay shows `overscan: N` and `rows: R/200 rendered`.

Compare `scroll fps est` during fast fling in each mode.

---

## Rerender frequency

Virtualizer recalc increments when visible index range changes (signature `first-last-count`).

| overscan | Extra index churn on small scroll |
|---|---|
| 4 | Higher — range changes sooner |
| 8 | Baseline |
| 12 | Lower — wider buffer |

Expect **more `virtualizer recalcs`** with overscan 4 on jittery scroll, not fewer.

---

## Decision

**Keep default overscan = 8.**

| Evidence | Verdict |
|---|---|
| 4 saves ~8 DOM nodes vs 8 | Marginal; flash risk on mobile fling |
| 12 adds ~8 nodes vs 8 | Diminishing returns at 200-row scale |
| Iter 13 mobile testing | 8 acceptable |

No default change in Iter 14. DEV param retained for staging evidence collection.

---

## Conclusion

Overscan 8 remains optimal for **200-row legacy sidebar**. DEV override enables honest A/B without production impact.
