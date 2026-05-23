# LiveGrid Map API Reconciliation Audit

## Mode

READ-ONLY AUDIT

NO CODE CHANGES.
NO FILE MODIFICATIONS.
NO MIGRATIONS.
NO REFACTORING.

Analysis only.

---

# gstack Workflow

Execute:

@gstack/.cursor/skills/gstack-plan-eng-review/SKILL.md

Additionally use if needed:

* gstack-investigate
* gstack-review
* gstack-cso

Follow SKILL instructions from PREAMBLE through all steps.

---

# Task

Audit current Map architecture and identify the mismatch between:

* frontend expectations
* Laravel API reality
* legacy NestJS assumptions
* RedesignMap implementation

Goal:
understand the REAL architecture mismatch before implementation.

---

# Required Context

Inspect:

* routes/api.php
* App.tsx
* frontend/src/**
* RedesignMap*
* map-related hooks
* API services
* query hooks
* filter system
* search services
* docs/*
* PROJECT_FULL_CONTEXT.md

Inspect ALL map-related API consumers before conclusions.

---

# Audit Objectives

Analyze:

* current map architecture
* current frontend expectations
* actual Laravel API routes
* missing endpoints
* incompatible response shapes
* duplicated API logic
* legacy NestJS assumptions
* filter/query mismatch
* pagination mismatch
* search coupling
* performance risks
* frontend/backend drift

---

# Important Constraints

Laravel routes/api.php is source of truth.

DO NOT trust:

* tmp-lg-work
* legacy NestJS assumptions
* frontend assumptions without verification

DO NOT:

* invent endpoints
* invent contracts
* propose fake compatibility layers

---

# Required Output Format

## Current Map Architecture

...

## Existing Frontend Expectations

...

## Actual Laravel API

...

## Missing Endpoints

...

## Response Shape Mismatches

...

## Legacy NestJS Dependencies

...

## Filter Coupling Problems

...

## Search Coupling Problems

...

## Frontend/Backend Drift

...

## High Risk Files

...

## Production Risks

...

## Recommended Safe Strategy

...

## Recommended Iteration Breakdown

...

## Rollback Complexity

...

## Final Recommendation

...

---

# Important Rules

DO NOT:

* modify code
* implement fixes
* propose massive rewrites
* invent unsupported APIs

ALWAYS:

* verify actual implementation
* verify actual routes
* verify actual consumers
* verify actual services

Analysis only.
