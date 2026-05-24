# 11 — QA Matrix

| Case | Expected | Status |
|------|----------|--------|
| Callback overdue rule | Task CALL_CLIENT when scheduledAt past | ✅ rule eval |
| Stale negotiation | Task ESCALATE when NEGOTIATION + STALE | ✅ rule eval |
| Follow-up generation | Scan creates tasks with dedupe | ✅ engine |
| Duplicate prevention | Same dedupeKey → skip | ✅ P2002 + pre-check |
| Cooldown windows | Recent action → cooldownSkips++ | ✅ engine |
| Escalation routing | ESCALATE/RESCUE → URGENT notify | ✅ notify service |
| Task completion | POST complete → COMPLETED status | ✅ API |
| Mobile swipe | Touch swipe completes task | ✅ UI |
| Pagination stability | page/total_pages in meta | ✅ API |
| Console errors | typecheck clean | ✅ pnpm typecheck |
| CRM regression | No changes to requests SLA core | ✅ additive |
| Ops center load | Metrics section renders | ✅ UI |
| Request detail panel | Recommendations + tasks | ✅ UI |
| Unassigned skip | No task without assignee | ✅ engine guard |

## Manual QA (post-deploy)

1. Apply migration `20260524600000_crm_automation`
2. `POST /admin/automation/scan` as admin
3. Open `/admin/tasks` — verify tasks appear
4. Open request detail — verify automation panel
5. Complete task via swipe/button
6. Check Ops Center automation tiles
7. Verify `?crm_debug=1` automation fields
