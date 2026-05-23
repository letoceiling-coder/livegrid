# Iteration 14.5 — Mobile Hardening

## Scope

Mobile 40vh bottom panel — same chrome as Iter 13, hardened scroll behavior.

---

## Changes (Iter 14)

| Item | Implementation |
|---|---|
| Overscroll isolation | `overscroll-behavior: contain` + `overscroll-y-contain` |
| Reduced motion | Instant selection scroll when OS setting on |
| Rapid tap coalesce | 280ms window → `auto` scroll |
| DEV FPS | Visible in overlay during fling |

**Not in scope:** map/list toggle (Iter 12 RFC deferred).

---

## 40vh + virtualization interaction

| Metric | Typical mobile |
|---|---|
| Panel height | ~280–360px |
| Visible rows | ~4–5 |
| Rendered (overscan 8) | ~21 |
| Scroll height (200 rows) | ~15 200px |

Virtualization reduces fling jank vs 200 DOM nodes; DEV FPS confirms at runtime.

---

## Touch momentum + scrollToIndex

**Risk:** smooth `scrollToIndex` during user fling fights touch momentum.

**Mitigation:**

1. Coalesce rapid programmatic scrolls → `auto`
2. `align: 'auto'` — minimal displacement
3. User fling not interrupted unless map selection changes

---

## Reduced motion (mobile)

iOS/Android accessibility → `prefers-reduced-motion: reduce`:

- Selection scroll instant
- No smooth scroll animation on sidebar

Verify: Settings → Reduce motion → map marker tap.

---

## DEV mobile checklist

```
Chrome DevTools → iPhone 14 Pro
/map?region_id=1&map_debug=1

□ Fling sidebar — map stays stable (no scroll chain)
□ Tap marker — row scrolls into view
□ Rapid marker taps — no scroll fight
□ overlay: scroll fps est ≥ 30 during fling
□ overlay: rows ~21/200
```

---

## Overscan stress on mobile

```
?sidebar_overscan=4  → fewer DOM, watch for flash
?sidebar_overscan=12 → more DOM, smoother fling
```

Default 8 retained.

---

## Conclusion

Mobile hardening focuses on **scroll isolation**, **accessible motion**, and **programmatic scroll safety** — not layout changes.
