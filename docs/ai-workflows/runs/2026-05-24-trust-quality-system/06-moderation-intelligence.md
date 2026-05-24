# 06 — Moderation Intelligence

## Metrics (`GET /admin/trust/metrics`)

- rejectRate
- repeatedViolations (agents with ≥ 2 rejects)
- duplicateFrequency
- suspiciousAgentCount
- qualityDistribution (high/medium/low)
- flaggedListings
- avgQualityScore

## Ops Center

Trust & Quality section in `AdminOpsCenter` with link to Trust Center.

## Moderation Stats

Existing `/admin/moderation/stats` unchanged. Trust metrics are additive.
