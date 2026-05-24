# 09 — Growth Risks

**Iteration:** 76 · **Date:** 2026-05-25

## Mitigated (iter 76)

| Risk | Mitigation |
|------|------------|
| Silent sitemap staleness | `sitemap_stale` health issue + System dashboard |
| Parity drift unnoticed | `parity_drift_*` issues + region table parity column |
| Trust copy drift | CMS-editable trust strip |
| Incomplete QC visibility | 8-metric data quality card |

## Remaining P1

| Risk | Action |
|------|--------|
| No push alerts | Wire Telegram ops broadcast when `critical` issues (optional) |
| Multi-region sitemap | Per-domain deploy or regional sitemap filter |
| Client-only meta | Acceptable at current crawl volume |

## P2

- Snapshot archival job when batch count exceeds warn threshold
- District landing pages (optional SEO hubs)

## Verdict

**Operational risks reduced** — push notifications remain optional enhancement.
