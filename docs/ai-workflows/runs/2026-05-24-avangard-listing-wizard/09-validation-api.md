# 09 — Validation + API

## Client validation

`@lg/shared` wizard-validation — Russian messages, step-aware.

## Server validation

Existing NestJS DTOs (`manual-*.dto.ts`):

- Price min, region exists, block region match
- Photo URL max length 2048, array max 24
- Kind-specific nested validation

API already returns Russian `BadRequestException` messages for domain errors.

## Wizard submit mapping

`listingWizardSubmit.ts` maps draft → create DTO per API kind.

## No breaking API changes

- No new endpoints
- No DTO field removals
- Media RBAC expanded (additive)
