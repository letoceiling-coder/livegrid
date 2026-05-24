# 06 — CRM Integration

## AdminRequestDetail

`RequestAutomationPanel` on overview tab:

- Recommended actions (rule-based, live eval)
- Escalation warning when priority ≥85
- Open follow-up tasks list
- Automation history (collapsible)

## API

`GET /admin/requests/:id/automation`

Returns `{ recommendations, tasks, actions, pendingTasks }`.

## Timeline Linkage

Recommendations reference SLA inactive labels. Automation actions timestamped in history panel — correlates with request timeline events without persisting timeline markers (additive, non-invasive).

## Invalidation

Task complete/dismiss triggers `crmInvalidate(qc, 'tasks')`.
