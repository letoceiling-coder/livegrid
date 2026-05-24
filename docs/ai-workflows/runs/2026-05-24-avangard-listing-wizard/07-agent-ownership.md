# 07 — Agent Ownership

## Rules (unchanged contract)

| Source | Contact |
|--------|---------|
| FEED | Agency contact, no owner |
| MANUAL | Agent owner when assigned |

## Wizard step 3 modes

| Mode | Who | API effect |
|------|-----|------------|
| self | Current user | Default `manualCreateFields` sets agent owner |
| agent | Selected agent | `PATCH /assign` after create |
| agency | No personal agent | Skip assign; agency contact on public card |

## RBAC

- **Agent:** only "self" mode
- **Admin/manager/editor:** all modes + agent picker from `GET /admin/listings/agents`

## Enforcement

Existing `ListingsGovernanceService.assertAgentCanManage` — not modified.
