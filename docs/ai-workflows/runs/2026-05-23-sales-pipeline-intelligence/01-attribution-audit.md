# Iter 38 — Attribution Capability Audit

## Mode

BUSINESS OPERATIONAL INTELLIGENCE — Phase 1 audit

---

## Pre-Iter 38 Baseline

| Capability | State | Gap |
|---|---|---|
| sourceUrl on requests | ✓ Persisted | Not classified |
| blockId / listingId | ✓ Linkage | No object pressure metrics |
| UTM parameters | ✗ Not stored | No marketing attribution |
| LeadForm source tag | ◐ In comment only | Not structured |
| Conversion surfaces | ◐ URL pathname | No canonical model |
| Map popup leads | ✓ `/map` URL | Not isolated in analytics |
| Favorites/share | ✗ No request linkage | Out of scope |

---

## Data Inventory

| Field | Usage |
|---|---|
| `requests.source_url` | Full page URL from LeadForm |
| `requests.block_id` | ЖК linkage |
| `requests.listing_id` | Listing linkage |
| `requests.comment` | May contain `Источник формы:` tag |
| `requests.telegram_sent` | TG channel indicator |

---

## Attribution Capability Matrix (Post-Iter 38)

| Requirement | Status |
|---|---|
| Source type classification | ✓ DONE |
| Conversion surface | ✓ DONE |
| Inflow by source | ✓ DONE |
| SLA pressure by source | ✓ DONE |
| Reopen ratio by source | ✓ DONE |
| Object pressure (ЖК/listing) | ✓ DONE |
| Pipeline bottleneck warnings | ✓ DONE |
| Detail attribution hints | ✓ DONE |
| Snapshot SOURCE_ATTRIBUTION | ✓ DONE |
| Snapshot OBJECT_PRESSURE | ✓ DONE |
| UTM / ad platform | ✗ OUT OF SCOPE |
| GA integration | ✗ OUT OF SCOPE |

---

## Verification

| Check | Result |
|---|---|
| `pnpm --filter @lg/shared build` | ✓ PASS |
| `pnpm --filter api exec tsc --noEmit` | ✓ PASS |
| `pnpm --filter web exec tsc --noEmit` | ✓ PASS |
