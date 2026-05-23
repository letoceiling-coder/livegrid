# Iter 31 — Final Verdict

## Mode

POST-CONVERSION PRODUCT WORKFLOW — CRM + Lead Management Parity

---

## Question

> Can LiveGrid ship CRM-grade lead processing without destabilizing map, geo, viewport, or conversion infrastructure?

## Answer

# GO_WITH_HOLD

**Ship CRM layer after:** DB migration deploy + manual QA pass.

**Deploy type:** API + web + DB migration (additive only)  
**Risk to map/conversion:** **LOW** — isolated to `requests` module + admin UI

---

## Delivered

| Phase | Deliverable | Status |
|---|---|---|
| 1 Audit | Gap matrix | ✓ `01-current-crm-audit.md` |
| 2 Status system | 8 statuses + transitions | ✓ Backend + shared enums |
| 3 List UX | Search, filters, mobile cards | ✓ `AdminRequests.tsx` |
| 4 Detail page | Full lead context | ✓ `AdminRequestDetail.tsx` |
| 5 Assignment | Admin + TG parity | ✓ |
| 6 TG visibility | Real fields only | ✓ Documented gaps |
| 7 Timeline | `RequestEvent` append-only | ✓ Migration + service |
| 8 Mobile CRM | 360px cards | ✓ |
| 9 Observability | DEV `?crm_debug=1` | ✓ |
| 10 Security | Role matrix | ✓ `07-security-governance.md` |

---

## Verification

| Check | Result |
|---|---|
| `pnpm --filter web exec tsc --noEmit` | ✓ PASS |
| `pnpm --filter api exec tsc --noEmit` | ✓ PASS |
| Prisma generate | ✓ PASS |
| DB migration applied | **HOLD** — run before deploy |
| Manual QA | **HOLD** — checklist below |

---

## Manual QA Checklist

- [ ] Create request from apartment page
- [ ] Create request from map popup
- [ ] Assign manager from detail
- [ ] Change status through pipeline (NEW → IN_PROGRESS → CONTACTED)
- [ ] Invalid transition rejected (e.g. NEW → SUCCESS)
- [ ] Filter by status + unassigned
- [ ] Search by phone / id
- [ ] Mobile CRM cards at 360px
- [ ] TG claim shows in timeline + TG block
- [ ] Sold apartment lead opens detail with listing link
- [ ] Unassigned queue filter
- [ ] Agent role cannot access `/admin/requests`
- [ ] Editor can access requests (API + UI)

---

## Known Gaps (accepted for v1)

| Gap | Severity | Blocker? |
|---|---|---|
| No `lastActivity` column | LOW | No |
| No list inline assign/status | LOW | No (detail has actions) |
| No bulk assign (removed) | LOW | Restore if ops request |
| No `tgDeliveryStatus` | LOW | Documented |
| No kanban view | LOW | List-first CRM |
| Agent no admin CRM | BY DESIGN | No |
| Migration not applied in all envs | **MEDIUM** | **Yes — deploy step** |

---

## Rollback

1. Revert web admin pages + routes
2. Revert API requests module changes
3. Migration is additive — rollback optional; old statuses still valid

---

## Risk Classification

### **LOW** (post-migration)

- Additive schema (new enum values + new table)
- No changes to map/viewport/geo modules
- Conversion forms unchanged except existing POST /requests path now logs events
- TG claim enhanced with events only

---

## Next Iteration Candidates (NOT this iter)

- `lastActivity` sort column
- Manager default "my leads" filter
- Bulk assign restore
- In-app notifications
- Kanban optional view using pipeline statuses

---

## Verdict

**GO_WITH_HOLD** — CRM parity achieved for real estate manager workflow. Hold until migration + manual QA complete. No viewport/geo/cluster work introduced.
