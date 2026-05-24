# 09 — Observability

## DEV-only overlay

`?listing_debug=1` on admin pages (disabled in PROD build).

Extended `ListingDebugOverlay`:

**Listings** (existing):
- query ms, by source, by visibility incl. REVIEW/REJECTED
- orphan, stale, ownership mismatch

**Moderation** (new, from `GET /admin/moderation/stats`):
- `reviewCount` — queue size
- `pendingRevisionCount` — live listings with pending edits
- `rejectedCount`
- `recentlyApprovedCount` — 14d window
- `staleReviewCount` — REVIEW > 48h
- `avgApprovalLatencyMs` — submit → approve (last 50)
- `conflictCount` — placeholder (0)

Refresh interval: 30s. Moderation stats silently omitted on 403 (agent role).
